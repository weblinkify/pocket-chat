from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# packages/shared/mock/replies.json: single source of mock replies for the app and the API.
_REPO_REPLIES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared" / "mock" / "replies.json"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_provider: Literal["mock", "openai", "anthropic"] = "mock"

    mock_latency_ms: int = 30
    mock_chunk_size: int = 4
    mock_seed: int = 42
    mock_slow_seconds: float = 60.0
    mock_replies_path: Path = _REPO_REPLIES

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
