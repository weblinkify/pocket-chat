# ADR 0001: State management

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

The app has three kinds of state with different lifetimes:

1. **Server state**: the model list and completion requests. It is async, can be cached, and can go stale.
2. **Ephemeral UI state**: whether the drawer is open, the draft text, the active stream, the selected model.
3. **Durable local data**: conversations and messages that must survive restarts and work offline.

Putting all three in one store (for example Redux) tends to mix caching, persistence, and UI concerns together.

## Decision

- **TanStack Query** for server state: retries, caching, and online/offline awareness (via `onlineManager` + NetInfo).
- **Zustand** for ephemeral UI state: small, needs no provider, and selectors are easy to test.
- **expo-sqlite** for durable conversations, accessed through a repository module with its own interface so tests can swap in an in-memory version.

## Consequences

- Each kind of state has exactly one home, which makes bugs easier to find.
- Streaming tokens are written to a Zustand slice while a reply streams, then saved to SQLite once it finishes. This avoids a database write for every token.
- Contributors need to learn three small libraries instead of one large one.

## Alternatives considered

- **Redux Toolkit + RTK Query:** capable, but more boilerplate than this app needs.
- **MMKV for conversations:** fast key-value storage, but searching conversations needs queries, which SQLite handles natively.
