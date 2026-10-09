import { create } from 'zustand';

export type StreamPhase = 'thinking' | 'streaming';

export interface ActiveStream {
  phase: StreamPhase;
  text: string;
  controller: AbortController;
}

interface StreamStore {
  streams: Record<string, ActiveStream>;
  start(conversationId: string, controller: AbortController): void;
  append(conversationId: string, delta: string): void;
  finish(conversationId: string): void;
  abort(conversationId: string): void;
}

/**
 * Ephemeral, per-conversation streaming state. Tokens live here while a reply
 * streams and are written to SQLite once it settles (see ADR 0001).
 */
export const useStreamStore = create<StreamStore>()((set, get) => ({
  streams: {},
  start: (id, controller) =>
    set((s) => ({ streams: { ...s.streams, [id]: { phase: 'thinking', text: '', controller } } })),
  append: (id, delta) =>
    set((s) => {
      const cur = s.streams[id];
      if (!cur) return s;
      return {
        streams: { ...s.streams, [id]: { ...cur, phase: 'streaming', text: cur.text + delta } },
      };
    }),
  finish: (id) =>
    set((s) => {
      if (!s.streams[id]) return s;
      const { [id]: _done, ...rest } = s.streams;
      return { streams: rest };
    }),
  abort: (id) => get().streams[id]?.controller.abort(),
}));
