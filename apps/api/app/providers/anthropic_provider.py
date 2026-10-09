from collections.abc import AsyncIterator

import anthropic
from anthropic.types.beta import BetaMessageParam

from app.config import Settings
from app.providers.base import ModelNotFoundError, ProviderError
from app.schemas import ChatMessage, Model

# Server-side refusal fallback: on a policy decline the API reroutes the request itself.
FALLBACK_BETA = "server-side-fallback-2026-07-01"


class AnthropicProvider:
    """Claude via the official Anthropic SDK. Enabled with LLM_PROVIDER=anthropic."""

    name = "anthropic"

    def __init__(self, settings: Settings, client: anthropic.AsyncAnthropic | None = None) -> None:
        key = settings.anthropic_api_key.get_secret_value() if settings.anthropic_api_key else None
        self._client = client or anthropic.AsyncAnthropic(api_key=key)
        self._model = settings.anthropic_model
        self._effort = settings.anthropic_effort
        self._max_tokens = settings.anthropic_max_tokens

    async def list_models(self) -> list[Model]:
        return [Model(id=self._model, owned_by="anthropic")]

    async def stream(
        self, model: str, messages: list[ChatMessage], seed: int | None
    ) -> AsyncIterator[str]:
        if model != self._model:
            raise ModelNotFoundError(model)
        system = "\n\n".join(m.content for m in messages if m.role == "system")
        history: list[BetaMessageParam] = [
            {"role": m.role, "content": m.content} for m in messages if m.role != "system"
        ]
        try:
            async with self._client.beta.messages.stream(
                model=self._model,
                max_tokens=self._max_tokens,
                messages=history,
                output_config={"effort": self._effort},
                betas=[FALLBACK_BETA],
                fallbacks="default",
                system=system or anthropic.omit,
            ) as stream:
                async for text in stream.text_stream:
                    yield text
                final = await stream.get_final_message()
        except anthropic.APIStatusError as e:
            raise ProviderError(f"Anthropic API error: {e.message}", status_code=502) from e
        except anthropic.APIConnectionError as e:
            raise ProviderError("Could not reach the Anthropic API", status_code=502) from e
        if final.stop_reason == "refusal":
            raise ProviderError(
                "The model declined to answer this request.", status_code=422, error_type="refusal"
            )
