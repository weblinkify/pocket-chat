# syntax=docker/dockerfile:1
# Build context: repository root (needs packages/shared/mock/replies.json).

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

FROM base AS build
COPY --from=ghcr.io/astral-sh/uv:0.12.24 /uv /usr/local/bin/uv
WORKDIR /app
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev --no-install-project
COPY apps/api/app ./app

FROM base AS runtime
RUN useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=build /app /app
COPY packages/shared/mock/replies.json /app/shared/mock/replies.json
ENV PATH="/app/.venv/bin:$PATH" \
    MOCK_REPLIES_PATH=/app/shared/mock/replies.json \
    LLM_PROVIDER=mock
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD ["python", "-c", "import urllib.request,sys; sys.exit(urllib.request.urlopen('http://127.0.0.1:8000/health').status != 200)"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
