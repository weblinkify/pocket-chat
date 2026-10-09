# ADR 0003: Streaming over Server-Sent Events

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

Assistant replies must render token by token, and the user must be able to stop a reply partway through. The API should feel familiar to anyone who knows the OpenAI Chat Completions format.

## Decision

- Use **SSE** (`text/event-stream`) on `POST /v1/chat/completions` with `stream: true`, following OpenAI's chunk format and ending with `data: [DONE]`.
- On mobile, read the response body incrementally and feed it to a **hand-written, unit-tested SSE parser** (a pure function from string chunks to events) instead of relying on an `EventSource` polyfill, since `EventSource` cannot send POST bodies.
- Stopping a reply uses `AbortController`. The server notices the client disconnecting and cancels the provider task.

## Consequences

- Plain HTTP means it works through proxies, logs cleanly, and can be tested with `curl -N`.
- The parser is a pure function, so it is easy to test exhaustively against chunk-boundary edge cases.
- Communication is one-way only, which is all chat completions need.
- React Native's `fetch` streaming support depends on the runtime. We use `expo/fetch`, which supports streaming `ReadableStream` bodies.

## Alternatives considered

- **WebSockets:** two-way, but needs its own connection lifecycle, reconnect logic, and auth handshake, which is too much for request-and-response streaming.
- **Long polling:** high latency and wasteful.
