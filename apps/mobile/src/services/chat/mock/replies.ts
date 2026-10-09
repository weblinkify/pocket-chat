import type { ChatMessage, Model } from '@pocket-chat/shared';

/**
 * Deterministic canned replies for the on-device mock. Keep the keyword
 * scenarios in sync with apps/api/app/providers/mock/scenarios.py.
 */

export const MOCK_MODELS: Model[] = [
  {
    id: 'mock-fast',
    object: 'model',
    owned_by: 'pocket-chat',
    description: 'Quick, short answers',
  },
  {
    id: 'mock-smart',
    object: 'model',
    owned_by: 'pocket-chat',
    description: 'Slower, more thorough answers',
  },
];

export type MockReply =
  | { kind: 'text'; text: string }
  | { kind: 'error'; status: number; message: string }
  | { kind: 'timeout' };

const CODE_TS = `Here's a small, typed debounce helper you can drop into any project:

\`\`\`typescript
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs = 300,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

const save = debounce((text: string) => console.log('saving', text), 500);
save('h');
save('hello'); // only this call runs
\`\`\`

**How it works**

1. Each call clears the previous timer.
2. Only the last call within \`waitMs\` actually fires.
3. Generics keep the argument types of \`fn\` intact.`;

const CODE_PY = `Here's an async retry decorator with exponential backoff:

\`\`\`python
import asyncio
import functools
import random


def retry(attempts: int = 3, base_delay: float = 0.2):
    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            for attempt in range(1, attempts + 1):
                try:
                    return await fn(*args, **kwargs)
                except Exception:
                    if attempt == attempts:
                        raise
                    delay = base_delay * 2 ** (attempt - 1)
                    await asyncio.sleep(delay + random.random() * 0.1)

        return wrapper

    return decorator
\`\`\`

Use it like \`@retry(attempts=5)\` on any \`async def\`.`;

const GREETING = `Hi! 👋 I'm the **Pocket Chat** mock assistant. I run entirely on your device, so there's no API key and no network needed.

Try sending one of these to see the different UI states:

- \`code\` returns a syntax-highlighted code block with a copy button
- \`python code\` returns the same thing, in Python
- \`error\` simulates a server error, so you can try **Retry**
- \`slow\` simulates a timeout
- anything else gets a streamed markdown answer`;

const POOL: string[] = [
  `Great question. Here's a quick breakdown:

### The short version
Most problems get easier once you **split them into smaller steps**. Start with the part you understand best, get it working, then build outward.

### A simple process
1. Write down what "done" looks like.
2. List the unknowns, and test the riskiest one first.
3. Ship something small, then improve it.

> Make it work, make it right, make it fast. In that order.`,

  `Sure! Here are a few ideas to think about:

- **Clarity beats cleverness.** Code is read far more often than it's written.
- **Name things well.** A good name saves a comment.
- **Delete code.** The best line of code is often the one you don't write.

Want me to go deeper on any of these?`,

  `Here's how I'd approach it:

**1. Understand the goal.** What outcome matters most: speed, cost, or quality?

**2. Pick a baseline.** Measure where you are today so you can tell whether a change helped.

**3. Iterate.** Change *one* variable at a time and compare.

That loop of measure, change one thing, and compare works for code, fitness, cooking, and most other things.`,

  `Let's compare the options side by side:

| Option | Pros | Cons |
| --- | --- | --- |
| Do it now | Momentum | Less planning |
| Plan first | Fewer surprises | Slower start |
| Prototype | Fast feedback | Throwaway work |

My pick is to **prototype first**, then plan with what you learned.`,

  `Here's a mental model I find useful: think of state as living in **three places**.

1. *Server state*: data that belongs to the backend. Cache it, and expect it to go stale.
2. *UI state*: what's open, selected, or being typed. It's short-lived.
3. *Persisted state*: what must survive a restart.

Keeping each in its own home, with \`TanStack Query\`, \`Zustand\`, and \`SQLite\`, makes bugs much easier to find.`,
];

const SMART_EPILOGUE = `

---

**Going a bit deeper**

There are trade-offs worth mentioning. Faster approaches often cost more upfront or are harder to maintain, and simpler ones may not scale. A good habit is to write down *why* you picked an option, a lightweight decision record, so that future-you (or a teammate) can revisit it when circumstances change.

**Next steps**
- Pick one thing to try today.
- Set a checkpoint to review how it went.
- Adjust and repeat.`;

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
  else text = POOL[hash(`${seed}:${last}`) % POOL.length] ?? '';

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
