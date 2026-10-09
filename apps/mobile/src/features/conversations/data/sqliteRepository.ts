import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from '@/lib/id';
import {
  previewOf,
  type Conversation,
  type ConversationRepository,
  type Message,
  type MessageRole,
  type MessageStatus,
} from './types';

/** Ordered migrations; index + 1 is the schema version stored in PRAGMA user_version. */
const MIGRATIONS = [
  `
  CREATE TABLE conversations (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE messages (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      if (sql) await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}

interface ConversationRow {
  id: string;
  title: string;
  model: string;
  created_at: number;
  updated_at: number;
  last?: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  error: string | null;
  created_at: number;
}

const toConversation = (r: ConversationRow): Conversation => ({
  id: r.id,
  title: r.title,
  model: r.model,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  role: r.role,
  content: r.content,
  status: r.status,
  ...(r.error != null ? { error: r.error } : {}),
  createdAt: r.created_at,
});

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export function createSqliteRepository(
  db: SQLiteDatabase,
  { now = Date.now } = {},
): ConversationRepository {
  return {
    async list(search) {
      const q = search?.trim();
      const like = q ? `%${escapeLike(q)}%` : null;
      const rows = await db.getAllAsync<ConversationRow>(
        `SELECT c.*,
           (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.rowid DESC LIMIT 1) AS last
         FROM conversations c
         WHERE ? IS NULL
            OR c.title LIKE ? ESCAPE '\\'
            OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ? ESCAPE '\\')
         ORDER BY c.updated_at DESC, c.rowid DESC`,
        [like, like, like],
      );
      return rows.map((r) => ({ ...toConversation(r), preview: previewOf(r.last ?? '') }));
    },
    async get(id) {
      const r = await db.getFirstAsync<ConversationRow>(
        'SELECT * FROM conversations WHERE id = ?',
        [id],
      );
      return r ? toConversation(r) : null;
    },
    async create({ title, model }) {
      const t = now();
      const c: Conversation = { id: createId('c_'), title, model, createdAt: t, updatedAt: t };
      await db.runAsync(
        'INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [c.id, c.title, c.model, t, t],
      );
      return c;
    },
    async update(id, patch) {
      await db.runAsync(
        `UPDATE conversations SET title = COALESCE(?, title), model = COALESCE(?, model), updated_at = ?
         WHERE id = ?`,
        [patch.title ?? null, patch.model ?? null, now(), id],
      );
    },
    async remove(id) {
      await db.runAsync('DELETE FROM conversations WHERE id = ?', [id]);
    },
    async removeAll() {
      await db.execAsync('DELETE FROM messages; DELETE FROM conversations;');
    },
    async messages(conversationId) {
      const rows = await db.getAllAsync<MessageRow>(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY rowid ASC',
        [conversationId],
      );
      return rows.map(toMessage);
    },
    async addMessage(input) {
      const m: Message = { ...input, id: createId('m_'), createdAt: now() };
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO messages (id, conversation_id, role, content, status, error, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [m.id, m.conversationId, m.role, m.content, m.status, m.error ?? null, m.createdAt],
        );
        await db.runAsync('UPDATE conversations SET updated_at = ? WHERE id = ?', [
          m.createdAt,
          m.conversationId,
        ]);
      });
      return m;
    },
    async removeMessage(id) {
      await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
    },
  };
}
