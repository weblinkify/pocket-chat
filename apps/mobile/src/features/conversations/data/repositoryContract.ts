import type { ConversationRepository } from './types';

/**
 * Behavioural contract every ConversationRepository must satisfy. Run against
 * the in-memory implementation in Jest; the SQLite one mirrors it on device.
 */
export function describeRepositoryContract(
  name: string,
  make: (clock: () => number) => ConversationRepository,
) {
  describe(`${name} (ConversationRepository contract)`, () => {
    let t: number;
    let repo: ConversationRepository;
    const tick = () => (t += 1000);

    beforeEach(() => {
      t = 1_700_000_000_000;
      repo = make(() => t);
    });

    it('creates and fetches a conversation', async () => {
      const c = await repo.create({ title: 'Hello', model: 'mock-fast' });
      expect(await repo.get(c.id)).toEqual(c);
      expect(c).toMatchObject({ title: 'Hello', model: 'mock-fast', createdAt: t, updatedAt: t });
    });

    it('returns null for an unknown id', async () => {
      expect(await repo.get('nope')).toBeNull();
    });

    it('lists conversations most-recently-updated first, with a preview', async () => {
      const a = await repo.create({ title: 'A', model: 'mock-fast' });
      tick();
      const b = await repo.create({ title: 'B', model: 'mock-fast' });
      tick();
      await repo.addMessage({
        conversationId: a.id,
        role: 'assistant',
        content: '## Heading\nbody',
        status: 'done',
      });
      const list = await repo.list();
      expect(list.map((c) => c.id)).toEqual([a.id, b.id]);
      expect(list[0]?.preview).toBe('Heading');
      expect(list[1]?.preview).toBe('');
    });

    it('searches titles and message content, case-insensitively', async () => {
      const a = await repo.create({ title: 'Trip to Lisbon', model: 'mock-fast' });
      const b = await repo.create({ title: 'Groceries', model: 'mock-fast' });
      await repo.addMessage({
        conversationId: b.id,
        role: 'user',
        content: 'buy LISBON cheese',
        status: 'done',
      });
      await repo.create({ title: 'Other', model: 'mock-fast' });
      expect((await repo.list('lisbon')).map((c) => c.id).sort()).toEqual([a.id, b.id].sort());
      expect(await repo.list('zzz')).toEqual([]);
    });

    it('treats LIKE wildcards in a search literally', async () => {
      await repo.create({ title: '100% done', model: 'mock-fast' });
      await repo.create({ title: '100 things', model: 'mock-fast' });
      expect((await repo.list('100%')).map((c) => c.title)).toEqual(['100% done']);
    });

    it('renames and changes model, bumping updatedAt', async () => {
      const c = await repo.create({ title: 'Old', model: 'mock-fast' });
      tick();
      await repo.update(c.id, { title: 'New', model: 'mock-smart' });
      expect(await repo.get(c.id)).toMatchObject({
        title: 'New',
        model: 'mock-smart',
        updatedAt: t,
      });
    });

    it('stores messages in insertion order and bumps the conversation', async () => {
      const c = await repo.create({ title: 'C', model: 'mock-fast' });
      tick();
      const m1 = await repo.addMessage({
        conversationId: c.id,
        role: 'user',
        content: 'hi',
        status: 'done',
      });
      const m2 = await repo.addMessage({
        conversationId: c.id,
        role: 'assistant',
        content: 'oops',
        status: 'error',
        error: 'boom',
      });
      expect((await repo.messages(c.id)).map((m) => m.id)).toEqual([m1.id, m2.id]);
      expect((await repo.messages(c.id))[1]).toMatchObject({ status: 'error', error: 'boom' });
      expect((await repo.get(c.id))?.updatedAt).toBe(t);
    });

    it('removes a single message', async () => {
      const c = await repo.create({ title: 'C', model: 'mock-fast' });
      const m = await repo.addMessage({
        conversationId: c.id,
        role: 'user',
        content: 'x',
        status: 'done',
      });
      await repo.removeMessage(m.id);
      expect(await repo.messages(c.id)).toEqual([]);
    });

    it('deletes a conversation and its messages', async () => {
      const c = await repo.create({ title: 'C', model: 'mock-fast' });
      await repo.addMessage({ conversationId: c.id, role: 'user', content: 'x', status: 'done' });
      await repo.remove(c.id);
      expect(await repo.get(c.id)).toBeNull();
      expect(await repo.messages(c.id)).toEqual([]);
      expect(await repo.list()).toEqual([]);
    });

    it('clears everything', async () => {
      await repo.create({ title: 'A', model: 'mock-fast' });
      await repo.create({ title: 'B', model: 'mock-fast' });
      await repo.removeAll();
      expect(await repo.list()).toEqual([]);
    });
  });
}
