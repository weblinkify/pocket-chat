from collections.abc import AsyncIterator
from typing import Protocol

from app.schemas import ChatMessage, Model


class ProviderError(Exception):
    """An error the API reports to clients with the standard error envelope."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 502,
        error_type: str = "upstream_error",
        code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.type = error_type
        self.code = code


class ModelNotFoundError(ProviderError):
    def __init__(self, model: str) -> None:
        super().__init__(
            f"Model '{model}' not found",
            status_code=404,
            error_type="invalid_request_error",
            code="model_not_found",
        )


class LLMProvider(Protocol):
    """Anything that can list models and stream a reply token by token."""

    name: str

    async def list_models(self) -> list[Model]: ...

    def stream(
        self, model: str, messages: list[ChatMessage], seed: int | None
    ) -> AsyncIterator[str]: ...
