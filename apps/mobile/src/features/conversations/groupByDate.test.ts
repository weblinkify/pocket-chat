import { buildConversation } from '@/test/factories';
import { groupByDate } from './groupByDate';

const now = new Date('2026-10-09T15:00:00').getTime();
const at = (iso: string, title: string) => ({
  ...buildConversation({ title, updatedAt: new Date(iso).getTime() }),
  preview: '',
});

describe('groupByDate', () => {
  it('buckets conversations and drops empty sections', () => {
    const sections = groupByDate(
      [
        at('2026-10-09T09:00:00', 'today'),
        at('2026-10-08T23:00:00', 'yesterday'),
        at('2026-10-04T12:00:00', 'week'),
        at('2026-09-20T12:00:00', 'month'),
        at('2025-01-01T12:00:00', 'old'),
      ],
      now,
    );
    expect(sections.map((s) => [s.title, s.data.map((c) => c.title)])).toEqual([
      ['Today', ['today']],
      ['Yesterday', ['yesterday']],
      ['Previous 7 days', ['week']],
      ['Previous 30 days', ['month']],
      ['Older', ['old']],
    ]);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByDate([], now)).toEqual([]);
  });
});
