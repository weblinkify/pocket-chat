import type { Message } from '@/features/conversations/data/types';
import type { DisplayMessage } from './components/MessageItem';
import type { ActiveStream } from './streamStore';

export const STREAMING_ID = '__streaming__';

/** Merge persisted messages with the in-flight reply, newest first (for an inverted list). */
export function toDisplayMessages(
  messages: Message[],
  stream: ActiveStream | undefined,
): DisplayMessage[] {
  const out: DisplayMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    status: m.status,
    error: m.error,
  }));
  if (stream) {
    out.push({ id: STREAMING_ID, role: 'assistant', content: stream.text, status: stream.phase });
  }
  return out.reverse();
}
