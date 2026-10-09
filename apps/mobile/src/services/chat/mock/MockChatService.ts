import {
  ChatServiceError,
  type ChatService,
  type CompletionRequest,
  type CompletionResult,
  type Model,
  type StreamOptions,
} from '../types';
import { MOCK_MODELS, chunkText, pickReply } from './replies';

export interface MockChatServiceOptions {
  /** Delay between chunks. Per-model defaults apply when omitted. */
  latencyMs?: number;
  /** How long the "slow" scenario waits before timing out. */
  timeoutMs?: number;
  seed?: number;
}

const MODEL_PROFILE: Record<string, { latencyMs: number; chunkSize: number }> = {
  'mock-fast': { latencyMs: 18, chunkSize: 4 },
  'mock-smart': { latencyMs: 30, chunkSize: 3 },
};

const aborted = () => new ChatServiceError('aborted', 'Generation stopped');

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(aborted());
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(aborted());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Fully on-device ChatService: deterministic replies, no network. */
export class MockChatService implements ChatService {
  readonly kind = 'mock' as const;

  constructor(private readonly opts: MockChatServiceOptions = {}) {}

  listModels(): Promise<Model[]> {
    return Promise.resolve(MOCK_MODELS);
  }

  async streamCompletion(
    req: CompletionRequest,
    { signal, onDelta }: StreamOptions,
  ): Promise<CompletionResult> {
    if (signal?.aborted) throw aborted();
    const profile = MODEL_PROFILE[req.model];
    if (!profile) throw new ChatServiceError('http', `Model '${req.model}' not found`, 404);

    const latency = this.opts.latencyMs ?? profile.latencyMs;
    const reply = pickReply(req.messages, req.model, req.seed ?? this.opts.seed ?? 42);

    // Short "thinking" pause so the typing indicator is visible.
    await sleep(latency * 8, signal);

    if (reply.kind === 'error') throw new ChatServiceError('http', reply.message, reply.status);
    if (reply.kind === 'timeout') {
      await sleep(this.opts.timeoutMs ?? 8000, signal);
      throw new ChatServiceError('timeout', 'The model took too long to respond.');
    }

    let content = '';
    for (const chunk of chunkText(reply.text, profile.chunkSize)) {
      await sleep(latency, signal);
      content += chunk;
      onDelta(chunk);
    }
    return { content, finishReason: 'stop' };
  }
}
