import {
  ChatCompletionChunkSchema,
  ErrorResponseSchema,
  ModelListSchema,
  STREAM_DONE,
} from '@pocket-chat/shared';

import { createSseParser, type SseEvent } from '@/lib/sse/parser';
import {
  ChatServiceError,
  type ChatService,
  type CompletionRequest,
  type CompletionResult,
  type Model,
  type StreamOptions,
} from '../types';

/** Minimal fetch shape shared by expo/fetch and the WHATWG global fetch. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  body: ReadableStream<Uint8Array> | null;
}>;

export interface HttpChatServiceOptions {
  baseUrl: string;
  fetch: FetchLike;
  /** Abort if no bytes arrive for this long. */
  timeoutMs?: number;
}

type Finish = CompletionResult['finishReason'];

/** ChatService backed by apps/api over HTTP + SSE (see ADR 0003). */
export class HttpChatService implements ChatService {
  readonly kind = 'http' as const;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly opts: HttpChatServiceOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  async listModels(): Promise<Model[]> {
    const res = await this.request('/v1/models', { method: 'GET', headers: {} });
    const parsed = ModelListSchema.safeParse(await readJson(res));
    if (!parsed.success) throw new ChatServiceError('protocol', 'Unexpected /v1/models response');
    return parsed.data.data;
  }

  async streamCompletion(
    req: CompletionRequest,
    { signal, onDelta }: StreamOptions,
  ): Promise<CompletionResult> {
    // One controller merges the caller's signal with our idle timeout.
    const ctrl = new AbortController();
    let timedOut = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const resetIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, this.timeoutMs);
    };
    const onAbort = () => ctrl.abort();
    if (signal?.aborted) throw new ChatServiceError('aborted', 'Generation stopped');
    signal?.addEventListener('abort', onAbort, { once: true });

    let content = '';
    let finish: Finish = null;
    let done = false;
    let streamError: ChatServiceError | undefined;

    const handleEvent = (ev: SseEvent) => {
      if (done || streamError) return;
      if (ev.data === STREAM_DONE) {
        done = true;
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(ev.data);
      } catch {
        streamError = new ChatServiceError('protocol', 'Malformed event from server');
        return;
      }
      if (ev.event === 'error') {
        const err = ErrorResponseSchema.safeParse(json);
        streamError = new ChatServiceError(
          'http',
          err.success ? err.data.error.message : 'Stream failed',
        );
        return;
      }
      const chunk = ChatCompletionChunkSchema.safeParse(json);
      if (!chunk.success) {
        streamError = new ChatServiceError('protocol', 'Unexpected chunk from server');
        return;
      }
      const choice = chunk.data.choices[0];
      const delta = choice?.delta.content;
      if (delta) {
        content += delta;
        onDelta(delta);
      }
      if (choice?.finish_reason) finish = choice.finish_reason;
    };

    try {
      resetIdle();
      const res = await this.request(
        '/v1/chat/completions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({ ...req, stream: true }),
        },
        ctrl.signal,
      );
      if (!res.body) throw new ChatServiceError('protocol', 'Response has no body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseParser(handleEvent);
      // Not every fetch implementation rejects a pending read() on abort, so race it.
      const aborted = new Promise<never>((_, reject) => {
        const fail = () => reject(new Error('aborted'));
        if (ctrl.signal.aborted) fail();
        else ctrl.signal.addEventListener('abort', fail, { once: true });
      });
      aborted.catch(() => undefined);
      for (;;) {
        if (ctrl.signal.aborted) {
          reader.cancel().catch(() => undefined);
          throw new Error('aborted');
        }
        const { done: eof, value } = await Promise.race([reader.read(), aborted]);
        if (eof) break;
        resetIdle();
        parser.feed(decoder.decode(value, { stream: true }));
        if (done || streamError) {
          // Fire-and-forget: some stream implementations never settle cancel().
          reader.cancel().catch(() => undefined);
          break;
        }
      }
      parser.feed(decoder.decode());
      parser.flush();
      if (streamError) throw streamError;
      return { content, finishReason: finish };
    } catch (e) {
      if (e instanceof ChatServiceError) throw e;
      if (signal?.aborted) throw new ChatServiceError('aborted', 'Generation stopped');
      if (timedOut) throw new ChatServiceError('timeout', 'The model took too long to respond.');
      throw new ChatServiceError('network', 'Network request failed');
    } finally {
      clearTimeout(idle);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  private async request(
    path: string,
    init: Parameters<FetchLike>[1],
    signal?: AbortSignal,
  ): ReturnType<FetchLike> {
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.opts.fetch(`${this.baseUrl}${path}`, signal ? { ...init, signal } : init);
    } catch (e) {
      if (signal?.aborted) throw e; // classified by the caller
      throw new ChatServiceError('network', 'Could not reach the server');
    }
    if (!res.ok) {
      const body = ErrorResponseSchema.safeParse(await readJson(res).catch(() => null));
      throw new ChatServiceError(
        'http',
        body.success ? body.data.error.message : `Server error (${res.status})`,
        res.status,
      );
    }
    return res;
  }
}

async function readJson(res: { text(): Promise<string> }): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
