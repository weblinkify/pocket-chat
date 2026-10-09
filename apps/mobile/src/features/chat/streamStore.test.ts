import { useStreamStore } from './streamStore';

beforeEach(() => useStreamStore.setState({ streams: {} }));

describe('streamStore', () => {
  it('moves from thinking to streaming as deltas arrive', () => {
    const s = useStreamStore.getState();
    s.start('c1', new AbortController());
    expect(useStreamStore.getState().streams.c1?.phase).toBe('thinking');
    s.append('c1', 'Hel');
    s.append('c1', 'lo');
    expect(useStreamStore.getState().streams.c1).toMatchObject({
      phase: 'streaming',
      text: 'Hello',
    });
  });

  it('ignores deltas and finishes for unknown conversations', () => {
    const before = useStreamStore.getState().streams;
    useStreamStore.getState().append('nope', 'x');
    useStreamStore.getState().finish('nope');
    expect(useStreamStore.getState().streams).toBe(before);
  });

  it('aborts and removes a stream', () => {
    const ctrl = new AbortController();
    useStreamStore.getState().start('c1', ctrl);
    useStreamStore.getState().abort('c1');
    expect(ctrl.signal.aborted).toBe(true);
    useStreamStore.getState().finish('c1');
    expect(useStreamStore.getState().streams.c1).toBeUndefined();
    expect(() => useStreamStore.getState().abort('missing')).not.toThrow();
  });
});
