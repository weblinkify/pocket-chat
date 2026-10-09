<div align="center">

# Pocket Chat

**A ChatGPT-style iOS chat app built with React Native and a FastAPI backend.**
The backend streams replies token by token and uses a built-in mock LLM, so the whole thing runs, streams, and passes CI with **no API keys**.

[![CI](https://github.com/weblinkify/pocket-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/weblinkify/pocket-chat/actions/workflows/ci.yml)
[![E2E iOS](https://github.com/weblinkify/pocket-chat/actions/workflows/e2e-ios.yml/badge.svg)](https://github.com/weblinkify/pocket-chat/actions/workflows/e2e-ios.yml)
[![codecov](https://codecov.io/gh/weblinkify/pocket-chat/graph/badge.svg)](https://codecov.io/gh/weblinkify/pocket-chat)
[![CodeQL](https://github.com/weblinkify/pocket-chat/actions/workflows/codeql.yml/badge.svg)](https://github.com/weblinkify/pocket-chat/actions/workflows/codeql.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-3776ab?logo=python&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<!-- TODO: record with `xcrun simctl io booted recordVideo demo.mov`, convert to GIF, save to docs/assets/demo.gif -->
<img src="docs/assets/demo.gif" alt="Demo: sending a message and watching the reply stream in" width="320" />

</div>

---

## Features

**Mobile (iOS, Expo + React Native)**

- Conversation drawer: create, rename, delete, search
- Markdown rendering with syntax-highlighted code blocks and a copy button
- Token-by-token streaming over SSE, with **Stop generating** and **Regenerate**
- Typing indicator, auto-scroll, retry on error, offline banner
- Model picker (`mock-fast`, `mock-smart`)
- Light/dark mode, Dynamic Type, VoiceOver labels on every control
- Conversations stored on the device, haptics on send, input box grows up to 6 lines

**Backend (Python, FastAPI)**

- `POST /v1/chat/completions` (streaming and non-streaming), `GET /v1/models`, `GET /health`
- `LLMProvider` protocol: **MockProvider** (default), OpenAI and Anthropic behind an env flag
- Mock replies are seeded and repeatable, and keywords trigger specific UI states (see [Mock scenarios](#mock-scenarios))
- Pydantic v2, structured logging, request IDs, rate limiting, CORS
- The OpenAPI schema is exported to `packages/shared`, and CI fails if it drifts

## Tech stack

| Layer   | Choices                                                                      |
| ------- | ---------------------------------------------------------------------------- |
| Mobile  | Expo (dev client), Expo Router, TanStack Query, Zustand, zod, expo-sqlite    |
| Backend | Python 3.12, FastAPI, Pydantic v2, uv                                        |
| Shared  | `@pocket-chat/shared`: TS types + zod schemas checked against OpenAPI        |
| Testing | Jest, React Native Testing Library, MSW, Maestro, pytest, hypothesis, respx  |
| Quality | ESLint (typescript-eslint strict), Prettier, ruff, mypy `--strict`, lefthook |
| CI/CD   | GitHub Actions, Codecov, GHCR + Trivy, EAS Build/Update, CodeQL, gitleaks    |

## Repository layout

```
pocket-chat/
├── apps/
│   ├── mobile/          # Expo app (React Native, TypeScript strict)
│   └── api/             # FastAPI service (Python 3.12, uv)
├── packages/
│   └── shared/          # API contract: TS types, zod schemas, openapi.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   └── adr/             # Architecture Decision Records
├── .github/workflows/   # ci, e2e-ios, api-docker, eas, codeql, gitleaks
├── docker-compose.yml
└── lefthook.yml
```

## Getting started

### Prerequisites

| Tool    | Version | Install                                                        |
| ------- | ------- | -------------------------------------------------------------- |
| Node    | 22 LTS  | `nvm install` (reads `.nvmrc`)                                 |
| pnpm    | 9+      | `corepack enable`                                              |
| Python  | 3.12    | `uv python install 3.12`                                       |
| uv      | latest  | `curl -LsSf https://astral.sh/uv/install.sh \| sh`             |
| Xcode   | 16+     | Mac App Store (needed for the iOS simulator)                   |
| Maestro | latest  | `curl -fsSL https://get.maestro.mobile.dev \| bash` (E2E only) |

### Install and run

```bash
pnpm install           # JS deps for every workspace, plus git hooks via lefthook
pnpm api:sync          # Python deps (uv sync in apps/api)
cp apps/api/.env.example apps/api/.env

pnpm dev               # starts the API in mock mode on :8000 and the Expo dev server
```

Press `i` in the Expo terminal to open the iOS simulator.

### Run the API with Docker

```bash
docker compose up --build
curl localhost:8000/health
```

### Use a real LLM provider (optional)

The mock provider is the default. To use a real model, set these in `apps/api/.env`:

```bash
LLM_PROVIDER=openai          # or: anthropic
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=...
```

No code changes are needed. CI never calls a real provider.

## Mock scenarios

When the mock provider is active, keywords in the **last user message** choose the reply:

| Keyword  | Behaviour                         | UI state it exercises         |
| -------- | --------------------------------- | ----------------------------- |
| `code`   | Returns a fenced code block       | Syntax highlight, copy button |
| `error`  | Responds with HTTP 500            | Error bubble, retry           |
| `slow`   | Streams past the client timeout   | Timeout handling, stop        |
| _(none)_ | Seeded lorem-style markdown reply | Normal streaming              |

To add a new scenario, see [docs/TESTING.md](docs/TESTING.md#adding-a-mock-scenario).

## Scripts

| Command          | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | API (mock mode) and Expo, running side by side          |
| `pnpm lint`      | ESLint + Prettier check (JS/TS), ruff (Python)          |
| `pnpm typecheck` | `tsc --noEmit` in every workspace, plus `mypy --strict` |
| `pnpm test`      | Jest (mobile, shared) and pytest (api), with coverage   |
| `pnpm e2e:ios`   | Maestro flows against a running simulator and mock API  |
| `pnpm openapi`   | Export the OpenAPI schema to `packages/shared`          |
| `pnpm format`    | Prettier and ruff format, writing changes               |

## Testing

Tests are written first (TDD), and CI enforces coverage thresholds: **85%** on mobile, **90%** on the API.
[docs/TESTING.md](docs/TESTING.md) covers the test pyramid, MSW handlers, SSE edge-case tests, and Maestro flows.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Testing strategy](docs/TESTING.md)
- [ADR 0001: State management](docs/adr/0001-state-management.md)
- [ADR 0002: Mocking strategy](docs/adr/0002-mocking-strategy.md)
- [ADR 0003: Streaming over SSE](docs/adr/0003-streaming-sse.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
