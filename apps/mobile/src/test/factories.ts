import type { Conversation, Message } from '@/features/conversations/data/types';
import { createId } from '@/lib/id';

export function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  const t = 1_700_000_000_000;
  return {
    id: createId('c_'),
    title: 'Test chat',
    model: 'mock-fast',
    createdAt: t,
    updatedAt: t,
    ...overrides,
  };
}

export function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: createId('m_'),
    conversationId: 'c_test',
    role: 'user',
    content: 'Hello',
    status: 'done',
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}
