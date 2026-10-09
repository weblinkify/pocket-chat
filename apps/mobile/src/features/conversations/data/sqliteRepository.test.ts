/**
 * @jest-environment node
 */
import { openNodeSqlite } from '@/test/nodeSqlite';
import { describeRepositoryContract } from './repositoryContract';
import { createSqliteRepository, migrate } from './sqliteRepository';

describeRepositoryContract('sqliteRepository', (clock) => {
  const db = openNodeSqlite();
  const repo = createSqliteRepository(db, { now: clock });
  const ready = migrate(db);
  // Wrap every method so it waits for migrations to finish.
  return new Proxy(repo, {
    get:
      (target, key: keyof typeof repo) =>
      async (...args: unknown[]) => {
        await ready;
        return (target[key] as (...a: unknown[]) => unknown)(...args);
      },
  });
});

describe('migrate', () => {
  it('is idempotent', async () => {
    const db = openNodeSqlite();
    await migrate(db);
    await migrate(db);
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 1 });
  });
});
