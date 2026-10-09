from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


def default_replies_path() -> Path:
    """Locate packages/shared/mock/replies.json, the single source of mock replies
    for the app and the API. Docker images set MOCK_REPLIES_PATH explicitly."""
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "packages" / "shared" / "mock" / "replies.json"
        if candidate.exists():
            return candidate
    raise FileNotFoundError("packages/shared/mock/replies.json not found; set MOCK_REPLIES_PATH")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_provider: Literal["mock", "openai", "anthropic"] = "mock"

    mock_latency_ms: int = 30
    mock_chunk_size: int = 4
    mock_seed: int = 42
    mock_slow_seconds: float = 60.0
    mock_replies_path: Path = Field(default_factory=default_replies_path)

    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-4o-mini"

    anthropic_api_key: SecretStr | None = None
    anthropic_model: str = "claude-opus-5-5"
    anthropic_effort: Literal["low", "medium", "high", "xhigh", "max"] = "medium"
    anthropic_max_tokens: int = 64_000

    cors_origins: str = "*"
    rate_limit: str = "60/minute"
    log_level: str = "info"
    log_json: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
