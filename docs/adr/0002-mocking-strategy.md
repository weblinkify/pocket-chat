# ADR 0002: Mocking strategy

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

The app must run, stream, and pass CI with no API keys and no network access to LLM vendors. Tests also need to reach every UI state, including errors, slow streams, and code blocks, without flaky timing.

## Decision

Mock at three levels, each at the boundary it owns:

| Level        | Tool                      | What it replaces                           |
| ------------ | ------------------------- | ------------------------------------------ |
| API runtime  | `MockProvider`            | The LLM vendor (the default in dev and CI) |
| API tests    | `respx`                   | Outbound HTTP to OpenAI and Anthropic      |
| Mobile tests | MSW (`msw/native`)        | The API itself, including SSE              |
| Mobile E2E   | Real API + `MockProvider` | Nothing in the app is mocked               |

`MockProvider` is seeded, and keywords in the message trigger scenarios (`code`, `error`, `slow`). MSW handlers mirror the same scenarios so unit tests and E2E tests describe the same behaviour.

## Consequences

- `pnpm dev` works for anyone right after cloning.
- Reply text lives once, in `packages/shared/mock/replies.json`. The small selection function exists in TS and Python, and parity tests pin identical hashes. Contract tests check the API's responses against `openapi.json`, and `test:live` runs the app's real HTTP client against the running server.
- Real providers are only tested through recorded and mocked HTTP, never live in CI.

## Alternatives considered

- **Recording real responses (VCR-style):** realistic, but needs keys to record and makes fixtures go stale.
- **Jest module mocks of `fetch`:** easy to write, but couples tests to implementation details and gives no confidence in SSE parsing.
