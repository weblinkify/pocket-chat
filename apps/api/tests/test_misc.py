import pytest

from app.config import Settings
from app.providers.base import ProviderError
from app.providers.mock.provider import MockProvider
from app.rate_limit import RateLimiter, RateLimitExceededError, parse_limit
from app.schemas import ChatMessage
from tests.conftest import make_settings


def test_parse_limit() -> None:
    assert parse_limit("60/minute") == (60, 60)
    assert parse_limit("5/seconds") == (5, 1)
    assert parse_limit("100/hour") == (100, 3600)


def test_rate_limiter_window_resets() -> None:
    now = [0.0]
    limiter = RateLimiter("2/minute", clock=lambda: now[0])
    limiter.check("a")
    limiter.check("a")
    with pytest.raises(RateLimitExceededError) as exc:
        limiter.check("a")
    assert exc.value.retry_after == 60
    limiter.check("b")  # keys are independent
    now[0] = 61
    limiter.check("a")


def test_cors_origin_list() -> None:
    assert make_settings(cors_origins="http://a, http://b,").cors_origin_list == [
        "http://a",
        "http://b",
    ]


def test_default_settings_use_mock_and_opus() -> None:
    s = Settings()
    assert s.llm_provider == "mock"
    assert s.anthropic_model == "claude-opus-5-5"


async def test_mock_timeout_scenario() -> None:
    provider = MockProvider(make_settings(mock_slow_seconds=0.01))
    with pytest.raises(ProviderError) as exc:
        [
            t
            async for t in provider.stream(
                "mock-fast", [ChatMessage(role="user", content="slow")], None
            )
        ]
    assert exc.value.status_code == 504


def test_replies_path_lookup_fails_clearly(monkeypatch: pytest.MonkeyPatch) -> None:
    from pathlib import Path

    from app import config

    monkeypatch.setattr(Path, "exists", lambda _self: False)
    with pytest.raises(FileNotFoundError, match="MOCK_REPLIES_PATH"):
        config.default_replies_path()
