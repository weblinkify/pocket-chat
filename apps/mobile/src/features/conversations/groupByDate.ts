import type { ConversationSummary } from './data/types';

export interface ConversationSection {
  title: string;
  data: ConversationSummary[];
}

const DAY = 86_400_000;

/** ChatGPT-style buckets: Today, Yesterday, Previous 7 days, Previous 30 days, Older. */
export function groupByDate(items: ConversationSummary[], now = Date.now()): ConversationSection[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const buckets: [string, (ts: number) => boolean][] = [
    ['Today', (ts) => ts >= t0],
    ['Yesterday', (ts) => ts >= t0 - DAY],
    ['Previous 7 days', (ts) => ts >= t0 - 7 * DAY],
    ['Previous 30 days', (ts) => ts >= t0 - 30 * DAY],
    ['Older', () => true],
  ];
  const sections = buckets.map(([title]) => ({ title, data: [] as ConversationSummary[] }));
  for (const item of items) {
    const i = buckets.findIndex(([, test]) => test(item.updatedAt));
    sections[i]!.data.push(item);
  }
  return sections.filter((s) => s.data.length > 0);
}
