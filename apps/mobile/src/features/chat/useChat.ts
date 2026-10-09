import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/features/conversations/queryKeys';
import { titleFrom, type Message } from '@/features/conversations/data/types';
import { useServices } from '@/providers/ServicesProvider';
import { ChatServiceError, type ChatMessage } from '@/services/chat/types';
import { useStreamStore } from './streamStore';

let regenerateSeed = 42;

const toHistory = (messages: Message[]): ChatMessage[] =>
  messages
    .filter((m) => m.status !== 'error' && m.content !== '')
    .map((m) => ({ role: m.role, content: m.content }));

/**
 * Chat orchestration: optimistic user turn, streamed assistant turn, stop,
 * regenerate and retry. UI components call this; they never touch services.
 */
export function useChat(conversationId: string | null) {
  const { chat, repo } = useServices();
  const qc = useQueryClient();
  const stream = useStreamStore((s) => (conversationId ? s.streams[conversationId] : undefined));

  const refresh = useCallback(
    async (id: string) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.messages(id) }),
        qc.invalidateQueries({ queryKey: queryKeys.allConversations }),
        qc.invalidateQueries({ queryKey: queryKeys.conversation(id) }),
      ]);
    },
    [qc],
  );

  const generate = useCallback(
    async (id: string, model: string, seed?: number) => {
      const store = useStreamStore.getState();
      const controller = new AbortController();
      store.start(id, controller);
      try {
        const history = toHistory(await repo.messages(id));
        const result = await chat.streamCompletion(
          { model, messages: history, ...(seed !== undefined ? { seed } : {}) },
          { signal: controller.signal, onDelta: (d) => useStreamStore.getState().append(id, d) },
        );
        await repo.addMessage({
          conversationId: id,
          role: 'assistant',
          content: result.content,
          status: 'done',
        });
      } catch (e) {
        const partial = useStreamStore.getState().streams[id]?.text ?? '';
        const err =
          e instanceof ChatServiceError
            ? e
            : new ChatServiceError('network', 'Something went wrong');
        if (err.kind === 'aborted') {
          if (partial) {
            await repo.addMessage({
              conversationId: id,
              role: 'assistant',
              content: partial,
              status: 'stopped',
            });
          }
        } else {
          await repo.addMessage({
            conversationId: id,
            role: 'assistant',
            content: partial,
            status: 'error',
            error: err.message,
          });
        }
      } finally {
        useStreamStore.getState().finish(id);
        await refresh(id);
      }
    },
    [chat, repo, refresh],
  );

  const isBusy = (id: string | null) => !!id && !!useStreamStore.getState().streams[id];

  /**
   * Send a user message. `onCreated` fires as soon as a new conversation exists
   * (so the screen can adopt its id); the promise resolves once the reply settles.
   */
  const send = useCallback(
    async (text: string, model: string, onCreated?: (id: string) => void): Promise<string> => {
      const content = text.trim();
      if (!content || isBusy(conversationId)) return conversationId ?? '';
      let id = conversationId;
      if (!id) {
        id = (await repo.create({ title: titleFrom(content), model })).id;
        onCreated?.(id);
      }
      await repo.addMessage({ conversationId: id, role: 'user', content, status: 'done' });
      await refresh(id);
      await generate(id, model);
      return id;
    },
    [conversationId, repo, refresh, generate],
  );

  /** Drop the last assistant reply (if any) and ask again. */
  const replaceLast = useCallback(
    async (id: string, model: string) => {
      if (isBusy(id)) return;
      const last = (await repo.messages(id)).at(-1);
      if (last?.role === 'assistant') await repo.removeMessage(last.id);
      await refresh(id);
      await generate(id, model, ++regenerateSeed);
    },
    [repo, refresh, generate],
  );

  const stop = useCallback(() => {
    if (conversationId) useStreamStore.getState().abort(conversationId);
  }, [conversationId]);

  return { stream, isStreaming: !!stream, send, stop, regenerate: replaceLast, retry: replaceLast };
}
