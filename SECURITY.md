# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's
[private vulnerability reporting](https://github.com/weblinkify/pocket-chat/security/advisories/new)
instead. We aim to reply within 72 hours.

## Secrets

- Never commit API keys. Copy `apps/api/.env.example` to `apps/api/.env`, which git ignores.
- gitleaks runs on pre-commit (when installed) and in CI.
- The default `LLM_PROVIDER=mock` needs no credentials.
