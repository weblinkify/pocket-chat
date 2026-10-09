import type { ChatMessage, Model } from '@pocket-chat/shared';
import mockData from '@pocket-chat/shared/mock/replies.json';

/**
 * Deterministic canned replies for the on-device mock. The reply text lives in
 * packages/shared/mock/replies.json, which apps/api reads too, and the
 * selection logic mirrors apps/api/app/providers/mock/scenarios.py.
 */

export const MOCK_MODELS: Model[] = mockData.models.map((m) => ({
  id: m.id,
  object: 'model',
  owned_by: 'pocket-chat',
  description: m.description,
}));

export type MockReply =
  | { kind: 'text'; text: string }
  | { kind: 'error'; status: number; message: string }
  | { kind: 'timeout' };

const {
  codeTypescript: CODE_TS,
  codePython: CODE_PY,
  greeting: GREETING,
  pool: POOL,
} = mockData.replies;
const SMART_EPILOGUE = mockData.replies.smartEpilogue;

const has = (text: string, word: string) => new RegExp(`\\b${word}\\b`, 'i').test(text);

/** FNV-1a 32-bit hash: tiny, deterministic, good enough for picking a reply. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickReply(messages: ChatMessage[], model: string, seed: number): MockReply {
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  if (has(last, 'error')) {
    return {
      kind: 'error',
      status: 500,
      message: 'The mock provider simulated an internal error.',
    };
  }
  if (has(last, 'slow')) return { kind: 'timeout' };

  let text: string;
  if (has(last, 'code')) text = has(last, 'python') ? CODE_PY : CODE_TS;
  else if (/^\s*(hi|hello|hey)\b/i.test(last)) text = GREETING;
  // Offset by seed so consecutive seeds (Regenerate) always pick a different reply.
  else text = POOL[(hash(last) + seed) % POOL.length] ?? '';

  if (model === 'mock-smart') text += SMART_EPILOGUE;
  return { kind: 'text', text };
}

/** Split text into chunks of `size` code points (never splits surrogate pairs). */
export function chunkText(text: string, size: number): string[] {
  if (size < 1) throw new RangeError('chunk size must be >= 1');
  const chars = Array.from(text);
  const chunks: string[] = [];
  for (let i = 0; i < chars.length; i += size) chunks.push(chars.slice(i, i + size).join(''));
  return chunks;
}
