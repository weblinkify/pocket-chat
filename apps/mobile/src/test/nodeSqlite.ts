import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync } from 'node:sqlite';

/**
 * Adapts Node's built-in SQLite (node:sqlite) to the subset of expo-sqlite's
 * async API the app uses, so repository SQL runs against a real database in Jest.
 */
export function openNodeSqlite(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:');
  type Params = (string | number | null)[];
  const adapter = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, params: Params = []) {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getAllAsync(sql: string, params: Params = []) {
      return db.prepare(sql).all(...params);
    },
    async getFirstAsync(sql: string, params: Params = []) {
      return db.prepare(sql).get(...params) ?? null;
    },
    async withTransactionAsync(task: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return adapter as unknown as SQLiteDatabase;
}
