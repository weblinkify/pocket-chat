# Contributing

## Workflow

1. Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, and so on.
2. **Test first.** Write a failing test, make it pass, then refactor.
3. Keep commits small, using [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(mobile): add stop-generating button`, `test(api): cover SSE chunk boundaries`.
   The `commit-msg` hook rejects messages that don't follow the format.
4. Before you push, run `pnpm lint && pnpm typecheck && pnpm test`.
5. Open a PR. The `ci-success` check must be green before merging.

## Scopes

`mobile`, `api`, `shared`, `ci`, `docs`, `deps`

## Code conventions

- **Mobile:** feature folders (`src/features/<feature>/`). UI components contain no business logic; logic lives in hooks. Network access goes through the `ChatService` interface.
- **API:** routers stay thin, providers implement `LLMProvider`, and every request and response is a Pydantic model.
- **Contract changes:** edit the Pydantic models, run `pnpm openapi`, then update the zod schemas in `packages/shared`. CI fails on drift.

## Paid services

Don't add any dependency on a paid service (hosting, analytics, error tracking, and so on) without discussing it in an issue first.
