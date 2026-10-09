import type { ChatMessage, Model } from '@pocket-chat/shared';

export type { ChatMessage, Model };

export type ChatErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'protocol';

export class ChatServiceError extends Error {
  readonly kind: ChatErrorKind;
  readonly status?: number;

  constructor(kind: ChatErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ChatServiceError';
    this.kind = kind;
    if (status !== undefined) this.status = status;
  }

  /** Errors the user can reasonably retry. */
  get retryable(): boolean {
    return this.kind !== 'aborted' && this.kind !== 'protocol';
  }
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  /** Mock providers are deterministic per seed; Regenerate bumps it. */
  seed?: number;
}

export interface StreamOptions {
  signal?: AbortSignal;
  onDelta: (text: string) => void;
}

export interface CompletionResult {
  content: string;
  finishReason: 'stop' | 'length' | null;
}

/**
 * Boundary between the app and whatever produces assistant replies.
 * Implementations: HttpChatService (talks to apps/api) and MockChatService
 * (deterministic, on-device). Injected via ChatServiceProvider.
 */
export interface ChatService {
  readonly kind: 'mock' | 'http';
  listModels(): Promise<Model[]>;
  streamCompletion(req: CompletionRequest, opts: StreamOptions): Promise<CompletionResult>;
}
