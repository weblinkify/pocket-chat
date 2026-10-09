from collections.abc import AsyncIterator

import openai
from openai.types.chat import ChatCompletionMessageParam

from app.config import Settings
from app.providers.base import ModelNotFoundError, ProviderError
from app.schemas import ChatMessage, Model


class OpenAIProvider:
    """OpenAI Chat Completions via the official SDK. Enabled with LLM_PROVIDER=openai."""

    name = "openai"

    def __init__(self, settings: Settings, client: openai.AsyncOpenAI | None = None) -> None:
        key = settings.openai_api_key.get_secret_value() if settings.openai_api_key else None
        self._client = client or openai.AsyncOpenAI(api_key=key)
        self._model = settings.openai_model

    async def list_models(self) -> list[Model]:
        return [Model(id=self._model, owned_by="openai")]

    async def stream(
        self, model: str, messages: list[ChatMessage], seed: int | None
    ) -> AsyncIterator[str]:
        if model != self._model:
            raise ModelNotFoundError(model)
        history: list[ChatCompletionMessageParam] = [
            {"role": m.role, "content": m.content}  # type: ignore[misc]
            for m in messages
        ]
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=history,
                stream=True,
                seed=seed if seed is not None else openai.omit,
            )
            async for chunk in response:
                if chunk.choices and (text := chunk.choices[0].delta.content):
                    yield text
        except openai.APIStatusError as e:
            raise ProviderError(f"OpenAI API error: {e.message}", status_code=502) from e
        except openai.APIConnectionError as e:
            raise ProviderError("Could not reach the OpenAI API", status_code=502) from e
