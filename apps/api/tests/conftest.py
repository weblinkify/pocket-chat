import socket
from collections.abc import AsyncIterator, Callable

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.config import Settings
from app.main import create_app


@pytest.fixture(autouse=True)
def _no_network(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail loudly if any test tries to open a real connection (e.g. to a provider API)."""

    def guard(*_: object, **__: object) -> None:
        raise RuntimeError("Network access is disabled in tests; mock the transport instead.")

    monkeypatch.setattr(socket.socket, "connect", guard)
    monkeypatch.setattr(socket, "create_connection", guard)


def make_settings(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "llm_provider": "mock",
        "mock_latency_ms": 0,
        "mock_chunk_size": 8,
        "mock_slow_seconds": 0.05,
        "rate_limit": "1000/minute",
        "log_json": False,
    }
    base.update(overrides)
    return Settings.model_validate(base)


@pytest.fixture
def settings() -> Settings:
    return make_settings()


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c,
    ):
        yield c


@pytest.fixture
def client_for() -> Callable[..., AsyncClient]:
    """Build a client for an app with custom settings (use as an async context manager)."""

    def build(**overrides: object) -> AsyncClient:
        app = create_app(make_settings(**overrides))
        return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    return build


def chat_body(
    content: str, *, model: str = "mock-fast", stream: bool = False, **extra: object
) -> dict[str, object]:
    return {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "stream": stream,
        **extra,
    }
