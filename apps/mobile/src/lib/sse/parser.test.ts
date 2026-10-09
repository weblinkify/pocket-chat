import { createSseParser, type SseEvent } from './parser';

function collect(chunks: string[]): SseEvent[] {
  const events: SseEvent[] = [];
  const parser = createSseParser((e) => events.push(e));
  chunks.forEach((c) => parser.feed(c));
  parser.flush();
  return events;
}

describe('createSseParser', () => {
  it('parses a single complete event', () => {
    expect(collect(['data: hello\n\n'])).toEqual([{ data: 'hello' }]);
  });

  it('parses several events in one chunk', () => {
    expect(collect(['data: a\n\ndata: b\n\n'])).toEqual([{ data: 'a' }, { data: 'b' }]);
  });

  it('reassembles an event split across chunks, even mid-field', () => {
    expect(collect(['da', 'ta: hel', 'lo\n', '\n'])).toEqual([{ data: 'hello' }]);
  });

  it('handles CRLF and lone CR line endings', () => {
    expect(collect(['data: a\r\n\r\ndata: b\r\rdata: c\n\n'])).toEqual([
      { data: 'a' },
      { data: 'b' },
      { data: 'c' },
    ]);
  });

  it('handles a CRLF split between two chunks', () => {
    expect(collect(['data: a\r', '\n\r\n'])).toEqual([{ data: 'a' }]);
  });

  it('joins multi-line data fields with newlines', () => {
    expect(collect(['data: line1\ndata: line2\n\n'])).toEqual([{ data: 'line1\nline2' }]);
  });

  it('ignores comment lines (keep-alives)', () => {
    expect(collect([': keep-alive\n\ndata: x\n\n'])).toEqual([{ data: 'x' }]);
  });

  it('captures event and id fields', () => {
    expect(collect(['event: error\nid: 7\ndata: {}\n\n'])).toEqual([
      { event: 'error', id: '7', data: '{}' },
    ]);
  });

  it('strips only one leading space after the colon', () => {
    expect(collect(['data:  two\n\ndata:none\n\n'])).toEqual([{ data: ' two' }, { data: 'none' }]);
  });

  it('does not dispatch events that have no data', () => {
    expect(collect(['event: ping\n\n'])).toEqual([]);
  });

  it('flushes a trailing event that never got a blank line', () => {
    expect(collect(['data: tail'])).toEqual([{ data: 'tail' }]);
  });

  it('preserves unicode across chunk boundaries', () => {
    expect(collect(['data: héllo 👋', ' wörld\n\n'])).toEqual([{ data: 'héllo 👋 wörld' }]);
  });

  it('gives the same result for every possible split point', () => {
    const stream = 'data: {"a":1}\n\n: c\ndata: x\ndata: y\n\nevent: e\ndata: [DONE]\n\n';
    const expected = collect([stream]);
    for (let i = 1; i < stream.length; i++) {
      expect(collect([stream.slice(0, i), stream.slice(i)])).toEqual(expected);
    }
  });
});
