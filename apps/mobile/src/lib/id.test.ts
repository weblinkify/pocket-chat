import { createId } from './id';

describe('createId', () => {
  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId()));
    expect(ids.size).toBe(1000);
  });

  it('applies a prefix', () => {
    expect(createId('msg_')).toMatch(/^msg_[a-z0-9]+$/);
  });
});
