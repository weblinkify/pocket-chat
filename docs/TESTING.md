# Testing

Every feature is built test-first: write a failing test, make it pass, then refactor.

## The pyramid

```
            ┌───────────┐
            │  Maestro  │   ~5 flows: send, stream, stop, regenerate, delete
            │   E2E     │   real API in mock mode, iOS simulator
          ┌─┴───────────┴─┐
          │  Integration  │  RNTL screens + MSW handlers (mobile)
          │               │  httpx AsyncClient against the FastAPI app (api)
        ┌─┴───────────────┴─┐
        │       Unit        │  SSE parser, hooks (renderHook), providers,
        │                   │  zod schemas, reducers, hypothesis properties
        └───────────────────┘
```

| Layer       | Mobile                                            | API                                        |
| ----------- | ------------------------------------------------- | ------------------------------------------ |
| Unit        | Jest, `renderHook`, SSE parser edge cases         | pytest, pytest-asyncio, hypothesis         |
| Integration | React Native Testing Library + MSW (`msw/native`) | `httpx.AsyncClient` + `ASGITransport`      |
| Contract    | zod schemas parse MSW fixtures                    | Responses validated against `openapi.json` |
| Outbound    | n/a                                               | `respx` mocks for OpenAI and Anthropic     |
| E2E         | Maestro (`apps/mobile/.maestro/*.yaml`)           | Exercised through the mobile E2E runs      |
| Snapshot    | **Markdown rendering only**                       | n/a                                        |

## Coverage gates

- Mobile: **85%** lines and branches (`coverageThreshold` in Jest config)
- API: **90%** (`--cov-fail-under=90`)

CI fails if either drops below its threshold.

## Running tests

```bash
pnpm test                                  # everything
pnpm --filter @pocket-chat/mobile test     # mobile only
pnpm api:test                              # api only
cd apps/api && uv run pytest -k sse -x     # a subset
pnpm e2e:ios                               # needs a booted simulator and `pnpm api:dev`
```

## Guidelines

- **Test behaviour, not implementation.** Query by role, label, or text, never by test IDs on internals.
- **Never hit a real network.** MSW's `onUnhandledRequest: 'error'` fails any request that has no handler.
- **Use factories, not literals.** Build test data with `buildConversation()` and `buildMessage()` (mobile) or `ConversationFactory` (api).
- **Make streaming repeatable.** Mock providers are seeded, and timers are faked where possible.

## SSE edge cases the parser must handle

- An event split across two network chunks
- Several events inside one chunk
- `\r\n` line endings as well as `\n`
- Comment lines (`: keep-alive`)
- Multi-line `data:` fields
- A `[DONE]` sentinel, and a stream that closes without one
- Malformed JSON in a `data:` line (should surface as an error, not a crash)
- An abort partway through the stream

On the API side, hypothesis generates random chunk sizes and Unicode text and checks that joining the deltas always gives back the original reply.

## Adding a mock scenario

Scenarios are triggered by a keyword in the last user message. To add one (for example `refuse`):

1. **API test first.** In `apps/api/tests/providers/test_mock_provider.py`, add a test that asserts the new behaviour.
2. **API implementation.** Register the keyword in `apps/api/app/providers/mock/scenarios.py`.
3. **Mobile handler.** Add a matching MSW handler in `apps/mobile/src/test/msw/handlers.ts` so unit and integration tests can use the same scenario.
4. **UI test.** Write an RNTL test for the UI state the scenario triggers.
5. **(Optional) E2E.** Add a Maestro flow in `apps/mobile/.maestro/`.
6. **Docs.** Add a row to the table in the README's _Mock scenarios_ section.
