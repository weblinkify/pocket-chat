/**
 * Runs against a real API (mock provider) when E2E_API_URL is set, e.g.
 *   E2E_API_URL=http://localhost:8000 pnpm --filter @pocket-chat/mobile test:live
 * Proves the app's zod contract accepts what the Python server actually emits.
 */
import { HttpChatService } from './HttpChatService';

const url = process.env.E2E_API_URL;
const describeLive = url ? describe : describe.skip;

describeLive('HttpChatService against the real API', () => {
  const svc = () =>
    new HttpChatService({ baseUrl: url!, fetch: globalThis.fetch, timeoutMs: 10_000 });
  const ask = (content: string) => ({
    model: 'mock-fast',
    messages: [{ role: 'user' as const, content }],
  });

  it('lists the mock models', async () => {
    expect((await svc().listModels()).map((m) => m.id)).toEqual(['mock-fast', 'mock-smart']);
  });

  it('streams a reply whose chunks pass the shared schema', async () => {
    const deltas: string[] = [];
    const result = await svc().streamCompletion(ask('hello'), { onDelta: (d) => deltas.push(d) });
    expect(deltas.length).toBeGreaterThan(5);
    expect(result).toMatchObject({
      finishReason: 'stop',
      content: expect.stringContaining('Pocket Chat'),
    });
  });

  it('surfaces the server error scenario', async () => {
    await expect(
      svc().streamCompletion(ask('error'), { onDelta: jest.fn() }),
    ).rejects.toMatchObject({
      kind: 'http',
      status: 500,
    });
  });
});
