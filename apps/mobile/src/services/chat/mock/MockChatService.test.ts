import { ChatServiceError } from '../types';
import { MockChatService } from './MockChatService';

const req = (content: string, model = 'mock-fast') => ({
  model,
  messages: [{ role: 'user' as const, content }],
});

const fast = () => new MockChatService({ latencyMs: 0, timeoutMs: 20 });

describe('MockChatService', () => {
  it('lists the mock models', async () => {
    expect((await fast().listModels()).map((m) => m.id)).toEqual(['mock-fast', 'mock-smart']);
  });

  it('streams deltas that add up to the final content', async () => {
    const deltas: string[] = [];
    const result = await fast().streamCompletion(req('hello'), { onDelta: (d) => deltas.push(d) });
    expect(deltas.length).toBeGreaterThan(1);
    expect(deltas.join('')).toBe(result.content);
    expect(result.finishReason).toBe('stop');
  });

  it('rejects with an http 500 error for "error"', async () => {
    await expect(
      fast().streamCompletion(req('error'), { onDelta: jest.fn() }),
    ).rejects.toMatchObject({ kind: 'http', status: 500 });
  });

  it('rejects with a timeout for "slow"', async () => {
    const onDelta = jest.fn();
    const err = await fast()
      .streamCompletion(req('slow'), { onDelta })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatServiceError);
    expect((err as ChatServiceError).kind).toBe('timeout');
    expect(onDelta).not.toHaveBeenCalled();
  });

  it('stops streaming when aborted', async () => {
    const svc = new MockChatService({ latencyMs: 5 });
    const ctrl = new AbortController();
    const deltas: string[] = [];
    const p = svc.streamCompletion(req('tell me a story', 'mock-smart'), {
      signal: ctrl.signal,
      onDelta: (d) => {
        deltas.push(d);
        if (deltas.length === 3) ctrl.abort();
      },
    });
    await expect(p).rejects.toMatchObject({ kind: 'aborted' });
    expect(deltas).toHaveLength(3);
  });

  it('rejects immediately if already aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      fast().streamCompletion(req('hi'), { signal: ctrl.signal, onDelta: jest.fn() }),
    ).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('rejects an unknown model', async () => {
    await expect(
      fast().streamCompletion(req('hi', 'gpt-9'), { onDelta: jest.fn() }),
    ).rejects.toMatchObject({ kind: 'http', status: 404 });
  });
});
