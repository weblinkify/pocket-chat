import asyncio
from collections.abc import AsyncIterator

from app.config import Settings
from app.providers.base import ModelNotFoundError, ProviderError
from app.providers.mock.scenarios import MOCK_MODELS, chunk_text, pick_reply
from app.schemas import ChatMessage, Model


class MockProvider:
    """Deterministic, key-free provider used by default, in dev and in CI."""

    name = "mock"

    def __init__(self, settings: Settings) -> None:
        self._latency = settings.mock_latency_ms / 1000
        self._chunk_size = settings.mock_chunk_size
        self._seed = settings.mock_seed
        self._slow_seconds = settings.mock_slow_seconds

    async def list_models(self) -> list[Model]:
        return list(MOCK_MODELS)

    async def stream(
        self, model: str, messages: list[ChatMessage], seed: int | None
    ) -> AsyncIterator[str]:
        if model not in {m.id for m in MOCK_MODELS}:
            raise ModelNotFoundError(model)
        reply = pick_reply(messages, model, self._seed if seed is None else seed)
        if reply.kind == "error":
            raise ProviderError(reply.text, status_code=reply.status, error_type="server_error")
        if reply.kind == "timeout":
            await asyncio.sleep(self._slow_seconds)
            raise ProviderError(
                "The model took too long to respond.", status_code=504, error_type="timeout"
            )
        for chunk in chunk_text(reply.text, self._chunk_size):
            await asyncio.sleep(self._latency)
            yield chunk
