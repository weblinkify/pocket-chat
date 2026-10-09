import { createMemoryRepository } from './memoryRepository';
import { describeRepositoryContract } from './repositoryContract';
import { previewOf, titleFrom } from './types';

describeRepositoryContract('memoryRepository', (clock) => createMemoryRepository({ now: clock }));

describe('titleFrom', () => {
  it('collapses whitespace', () => expect(titleFrom('  hello \n world ')).toBe('hello world'));
  it('falls back for empty input', () => expect(titleFrom('   ')).toBe('New chat'));
  it('truncates long text with an ellipsis', () => {
    const t = titleFrom('a'.repeat(100));
    expect(t).toHaveLength(48);
    expect(t.endsWith('…')).toBe(true);
  });
});

describe('previewOf', () => {
  it('replaces code blocks and strips markdown symbols', () => {
    expect(previewOf('```ts\nconst a = 1\n```\nafter')).toBe('[code]');
    expect(previewOf('**bold** text')).toBe('bold text');
  });
});
