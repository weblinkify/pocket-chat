/**
 * Incremental Server-Sent Events parser (WHATWG spec subset).
 *
 * Pure and transport-agnostic: feed it string chunks as they arrive from the
 * network, in any split, and it emits complete events. See ADR 0003.
 */
export interface SseEvent {
  data: string;
  event?: string;
  id?: string;
}

export interface SseParser {
  feed(chunk: string): void;
  /** Dispatch any event left in the buffer when the stream closes. */
  flush(): void;
}

export function createSseParser(onEvent: (event: SseEvent) => void): SseParser {
  let buffer = '';
  // A chunk ending in '\r' may be the first half of '\r\n'.
  let pendingCR = false;
  let data: string[] = [];
  let event: string | undefined;
  let id: string | undefined;

  const dispatch = () => {
    if (data.length > 0) {
      const out: SseEvent = { data: data.join('\n') };
      if (event !== undefined) out.event = event;
      if (id !== undefined) out.id = id;
      onEvent(out);
    }
    data = [];
    event = undefined;
    id = undefined;
  };

  const processLine = (line: string) => {
    if (line === '') return dispatch();
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') data.push(value);
    else if (field === 'event') event = value;
    else if (field === 'id') id = value;
  };

  return {
    feed(chunk) {
      let text = chunk;
      if (pendingCR && text.startsWith('\n')) text = text.slice(1);
      pendingCR = false;
      buffer += text;

      let start = 0;
      for (let i = 0; i < buffer.length; i++) {
        const ch = buffer[i];
        if (ch !== '\n' && ch !== '\r') continue;
        processLine(buffer.slice(start, i));
        if (ch === '\r') {
          if (i + 1 === buffer.length) pendingCR = true;
          else if (buffer[i + 1] === '\n') i++;
        }
        start = i + 1;
      }
      buffer = buffer.slice(start);
    },
    flush() {
      if (buffer !== '') processLine(buffer);
      buffer = '';
      dispatch();
    },
  };
}
