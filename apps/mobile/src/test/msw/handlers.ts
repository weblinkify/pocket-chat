import { http, HttpResponse } from 'msw';

import { MOCK_MODELS, chunkText, pickReply } from '@/services/chat/mock/replies';
import { deltasToSse, sseResponse } from './sse';

export const API_URL = 'http://api.test';

/**
 * MSW handlers mirroring apps/api in mock mode. They reuse the same scenario
 * logic as the on-device mock, so tests and E2E describe the same behaviour.
 */
export const handlers = [
  http.get(`${API_URL}/v1/models`, () => HttpResponse.json({ object: 'list', data: MOCK_MODELS })),

  http.post(`${API_URL}/v1/chat/completions`, async ({ request }) => {
    const body = (await request.json()) as {
      model: string;
      messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
      seed?: number;
    };
    const reply = pickReply(body.messages, body.model, body.seed ?? 42);
    if (reply.kind === 'error') {
      return HttpResponse.json(
        { error: { message: reply.message, type: 'server_error' } },
        { status: reply.status },
      );
    }
    if (reply.kind === 'timeout') return sseResponse([': waiting\n\n'], { hang: true });
    return sseResponse(deltasToSse(chunkText(reply.text, 8), body.model));
  }),
];
