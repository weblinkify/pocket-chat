import { createId } from '@/lib/id';
import {
  previewOf,
  type Conversation,
  type ConversationRepository,
  type ConversationSummary,
  type Message,
} from './types';

export function createMemoryRepository({ now = Date.now } = {}): ConversationRepository {
  const conversations = new Map<string, Conversation>();
  const messages: Message[] = [];

  const touch = (id: string) => {
    const c = conversations.get(id);
    if (c) c.updatedAt = now();
  };

  return {
    async list(search) {
      const q = search?.trim().toLowerCase();
      const out: ConversationSummary[] = [];
      for (const c of conversations.values()) {
        const msgs = messages.filter((m) => m.conversationId === c.id);
        if (
          q &&
          !c.title.toLowerCase().includes(q) &&
          !msgs.some((m) => m.content.toLowerCase().includes(q))
        ) {
          continue;
        }
        out.push({ ...c, preview: previewOf(msgs.at(-1)?.content ?? '') });
      }
      // Newest first; ties broken by creation order (newest first) like SQLite's rowid DESC.
      return out.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
    },
    async get(id) {
      const c = conversations.get(id);
      return c ? { ...c } : null;
    },
    async create({ title, model }) {
      const t = now();
      const c: Conversation = { id: createId('c_'), title, model, createdAt: t, updatedAt: t };
      conversations.set(c.id, c);
      return { ...c };
    },
    async update(id, patch) {
      const c = conversations.get(id);
      if (c) Object.assign(c, patch, { updatedAt: now() });
    },
    async remove(id) {
      conversations.delete(id);
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.conversationId === id) messages.splice(i, 1);
      }
    },
    async removeAll() {
      conversations.clear();
      messages.length = 0;
    },
    async messages(conversationId) {
      return messages.filter((m) => m.conversationId === conversationId).map((m) => ({ ...m }));
    },
    async addMessage(input) {
      const m: Message = { ...input, id: createId('m_'), createdAt: now() };
      if (m.error === undefined) delete m.error;
      messages.push(m);
      touch(input.conversationId);
      return { ...m };
    },
    async removeMessage(id) {
      const i = messages.findIndex((m) => m.id === id);
      if (i !== -1) messages.splice(i, 1);
    },
  };
}
