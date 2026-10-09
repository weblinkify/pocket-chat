import { chunkText, pickReply, MOCK_MODELS, type MockReply } from './replies';

const user = (content: string) => [{ role: 'user' as const, content }];
const textOf = (r: MockReply) => (r.kind === 'text' ? r.text : '');

describe('pickReply', () => {
  it('is deterministic for the same input and seed', () => {
    expect(pickReply(user('tell me something'), 'mock-fast', 42)).toEqual(
      pickReply(user('tell me something'), 'mock-fast', 42),
    );
  });

  it('can vary with the seed', () => {
    const replies = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) => textOf(pickReply(user('tell me more'), 'mock-fast', s))),
    );
    expect(replies.size).toBeGreaterThan(1);
  });

  it('returns a fenced code block for "code"', () => {
    const r = pickReply(user('Show me some code'), 'mock-fast', 1);
    expect(r.kind).toBe('text');
    expect(textOf(r)).toMatch(/```typescript\n[\s\S]+```/);
  });

  it('uses python when asked', () => {
    expect(textOf(pickReply(user('python code please'), 'mock-fast', 1))).toContain('```python');
  });

  it('simulates a server error for "error"', () => {
    expect(pickReply(user('trigger an error'), 'mock-fast', 1).kind).toBe('error');
  });

  it('simulates a timeout for "slow"', () => {
    expect(pickReply(user('be slow'), 'mock-fast', 1).kind).toBe('timeout');
  });

  it('matches keywords on word boundaries, case-insensitively', () => {
    expect(pickReply(user('ERROR!'), 'mock-fast', 1).kind).toBe('error');
    expect(pickReply(user('terrorist movie plot'), 'mock-fast', 1).kind).toBe('text');
  });

  it('only looks at the last user message', () => {
    const msgs = [
      { role: 'user' as const, content: 'error' },
      { role: 'assistant' as const, content: 'oops' },
      { role: 'user' as const, content: 'hello' },
    ];
    expect(pickReply(msgs, 'mock-fast', 1).kind).toBe('text');
  });

  it('gives mock-smart a longer answer than mock-fast', () => {
    const fast = textOf(pickReply(user('explain'), 'mock-fast', 3));
    const smart = textOf(pickReply(user('explain'), 'mock-smart', 3));
    expect(smart.length).toBeGreaterThan(fast.length);
  });

  it('greets on hello', () => {
    expect(textOf(pickReply(user('hi'), 'mock-fast', 1))).toMatch(/Pocket Chat/);
  });
});

describe('chunkText', () => {
  it('joins back to the original text', () => {
    const text = 'Héllo 👋 wörld, this is **markdown**.';
    for (const size of [1, 2, 3, 7, 100]) expect(chunkText(text, size).join('')).toBe(text);
  });

  it('never splits a surrogate pair', () => {
    for (const c of chunkText('👋👋👋', 1)) expect(c).toBe('👋');
  });

  it('rejects a non-positive size', () => {
    expect(() => chunkText('abc', 0)).toThrow();
  });
});

describe('MOCK_MODELS', () => {
  it('exposes mock-fast and mock-smart', () => {
    expect(MOCK_MODELS.map((m) => m.id)).toEqual(['mock-fast', 'mock-smart']);
  });
});
