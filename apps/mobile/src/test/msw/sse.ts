import { HttpResponse } from 'msw';

const encoder = new TextEncoder();

export function chunkEvent(content: string, model = 'mock-fast', finish: 'stop' | null = null) {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion.chunk',
    created: 1,
    model,
    choices: [{ index: 0, delta: content ? { content } : {}, finish_reason: finish }],
  };
}

/** Build an SSE byte stream from raw string pieces, optionally pausing between them. */
export function sseResponse(pieces: string[], { delayMs = 0, hang = false } = {}) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const piece of pieces) {
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        controller.enqueue(encoder.encode(piece));
      }
      if (!hang) controller.close();
    },
  });
  return new HttpResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

/** Encode a list of deltas as a well-formed OpenAI-style SSE stream. */
export function deltasToSse(deltas: string[], model?: string): string[] {
  return [
    ...deltas.map((d) => `data: ${JSON.stringify(chunkEvent(d, model))}\n\n`),
    `data: ${JSON.stringify(chunkEvent('', model, 'stop'))}\n\n`,
    'data: [DONE]\n\n',
  ];
}
