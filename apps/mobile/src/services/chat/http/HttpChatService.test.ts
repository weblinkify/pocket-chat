/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions": ["node", "require", "default"]}
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { API_URL, handlers } from '@/test/msw/handlers';
import { chunkEvent, deltasToSse, sseResponse } from '@/test/msw/sse';
import { ChatServiceError } from '../types';
import { HttpChatService } from './HttpChatService';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const svc = (timeoutMs = 2000) =>
  new HttpChatService({ baseUrl: API_URL, fetch: globalThis.fetch, timeoutMs });

const req = (content: string) => ({
  model: 'mock-fast',
  messages: [{ role: 'user' as const, content }],
});

const completions = `${API_URL}/v1/chat/completions`;

describe('HttpChatService', () => {
  it('lists models validated against the shared schema', async () => {
    expect((await svc().listModels()).map((m) => m.id)).toEqual(['mock-fast', 'mock-smart']);
  });

  it('rejects a model list that does not match the contract', async () => {
    server.use(http.get(`${API_URL}/v1/models`, () => HttpResponse.json({ nope: true })));
    await expect(svc().listModels()).rejects.toMatchObject({ kind: 'protocol' });
  });

  it('streams deltas and resolves with the full content', async () => {
    const deltas: string[] = [];
    const result = await svc().streamCompletion(req('hello'), { onDelta: (d) => deltas.push(d) });
    expect(deltas.length).toBeGreaterThan(1);
    expect(deltas.join('')).toBe(result.content);
    expect(result.content).toContain('Pocket Chat');
    expect(result.finishReason).toBe('stop');
  });

  it('sends stream: true plus the model, messages and seed', async () => {
    let body: unknown;
    server.use(
      http.post(completions, async ({ request }) => {
        body = await request.json();
        return sseResponse(deltasToSse(['ok']));
      }),
    );
    await svc().streamCompletion({ ...req('x'), seed: 7 }, { onDelta: jest.fn() });
    expect(body).toEqual({ ...req('x'), seed: 7, stream: true });
  });

  it('handles events split at awkward byte boundaries', async () => {
    const raw = deltasToSse(['Hé', 'llo 👋']).join('');
    const bytes = Array.from(raw); // one code point per network chunk
    server.use(http.post(completions, () => sseResponse(bytes)));
    const result = await svc().streamCompletion(req('x'), { onDelta: jest.fn() });
    expect(result.content).toBe('Héllo 👋');
  });

  it('maps an HTTP error body to a ChatServiceError', async () => {
    const err = await svc()
      .streamCompletion(req('error'), { onDelta: jest.fn() })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatServiceError);
    expect(err).toMatchObject({ kind: 'http', status: 500, retryable: true });
    expect((err as Error).message).toMatch(/simulated/);
  });

  it('uses a generic message when the error body is not JSON', async () => {
    server.use(http.post(completions, () => new HttpResponse('bad gateway', { status: 502 })));
    await expect(svc().streamCompletion(req('x'), { onDelta: jest.fn() })).rejects.toMatchObject({
      kind: 'http',
      status: 502,
      message: 'Server error (502)',
    });
  });

  it('times out when the stream goes idle', async () => {
    const err = await svc(150)
      .streamCompletion(req('slow'), { onDelta: jest.fn() })
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: 'timeout' });
  });

  it('reports aborted when the caller stops generation', async () => {
    server.use(
      http.post(completions, () => sseResponse(deltasToSse(['a', 'b', 'c', 'd']), { delayMs: 30 })),
    );
    const ctrl = new AbortController();
    const deltas: string[] = [];
    const p = svc().streamCompletion(req('x'), {
      signal: ctrl.signal,
      onDelta: (d) => {
        deltas.push(d);
        ctrl.abort();
      },
    });
    await expect(p).rejects.toMatchObject({ kind: 'aborted' });
    expect(deltas).toEqual(['a']);
  });

  it('surfaces an in-stream error event', async () => {
    server.use(
      http.post(completions, () =>
        sseResponse([
          `data: ${JSON.stringify(chunkEvent('par'))}\n\n`,
          'event: error\ndata: {"error":{"message":"provider exploded","type":"server_error"}}\n\n',
        ]),
      ),
    );
    await expect(svc().streamCompletion(req('x'), { onDelta: jest.fn() })).rejects.toMatchObject({
      kind: 'http',
      message: 'provider exploded',
    });
  });

  it('treats malformed JSON in a data line as a protocol error', async () => {
    server.use(http.post(completions, () => sseResponse(['data: {not json\n\n'])));
    await expect(svc().streamCompletion(req('x'), { onDelta: jest.fn() })).rejects.toMatchObject({
      kind: 'protocol',
    });
  });

  it('accepts a stream that closes without [DONE]', async () => {
    server.use(
      http.post(completions, () => sseResponse([`data: ${JSON.stringify(chunkEvent('hi'))}\n\n`])),
    );
    const result = await svc().streamCompletion(req('x'), { onDelta: jest.fn() });
    expect(result).toEqual({ content: 'hi', finishReason: null });
  });

  it('reports a network failure', async () => {
    server.use(http.post(completions, () => HttpResponse.error()));
    await expect(svc().streamCompletion(req('x'), { onDelta: jest.fn() })).rejects.toMatchObject({
      kind: 'network',
    });
  });
});
