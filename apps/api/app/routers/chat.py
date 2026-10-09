import json
import time
import uuid
from collections.abc import AsyncIterator
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.providers.base import LLMProvider, ProviderError
from app.routers.deps import get_provider
from app.schemas import (
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionRequest,
    ChatMessage,
    Choice,
    ChunkChoice,
    Delta,
    ErrorDetail,
    ErrorResponse,
)
from app.sse import DONE, sse_event

router = APIRouter(prefix="/v1", tags=["chat"])
log = structlog.get_logger("chat")

ERRORS: dict[int | str, dict[str, object]] = {
    code: {"model": ErrorResponse} for code in (404, 422, 429, 500, 502, 504)
}


async def _rate_limit(request: Request) -> None:
    await request.app.state.rate_limiter(request)


@router.post(
    "/chat/completions",
    response_model=ChatCompletion,
    dependencies=[Depends(_rate_limit)],
    responses={
        200: {
            "description": "A completion, or with `stream: true` an SSE stream of "
            "`ChatCompletionChunk` events ending in `data: [DONE]`.",
            "content": {
                "text/event-stream": {
                    "schema": {"$ref": "#/components/schemas/ChatCompletionChunk"}
                }
            },
        },
        **ERRORS,
    },
)
async def create_completion(
    body: ChatCompletionRequest,
    provider: Annotated[LLMProvider, Depends(get_provider)],
) -> ChatCompletion | StreamingResponse:
    completion_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
    created = int(time.time())
    tokens = provider.stream(body.model, body.messages, body.seed)

    if not body.stream:
        content = "".join([t async for t in tokens])
        return ChatCompletion(
            id=completion_id,
            created=created,
            model=body.model,
            choices=[
                Choice(
                    index=0,
                    message=ChatMessage(role="assistant", content=content),
                    finish_reason="stop",
                )
            ],
        )

    # Pull the first token before committing to a 200, so early failures
    # (unknown model, simulated 500, timeout) get a real HTTP status.
    first = await anext(tokens, None)

    def chunk(delta: Delta, finish: bool = False) -> str:
        c = ChatCompletionChunk(
            id=completion_id,
            created=created,
            model=body.model,
            choices=[ChunkChoice(index=0, delta=delta, finish_reason="stop" if finish else None)],
        )
        # finish_reason is always present (nullable); unset delta fields are omitted.
        payload = c.model_dump(mode="json")
        payload["choices"][0]["delta"] = delta.model_dump(mode="json", exclude_none=True)
        return sse_event(json.dumps(payload, separators=(",", ":")))

    async def events() -> AsyncIterator[str]:
        yield chunk(Delta(role="assistant", content=first or ""))
        try:
            async for token in tokens:
                yield chunk(Delta(content=token))
        except ProviderError as e:
            log.warning("stream_failed", error=e.message)
            err = ErrorResponse(error=ErrorDetail(message=e.message, type=e.type, code=e.code))
            yield sse_event(err.model_dump_json(), event="error")
            return
        yield chunk(Delta(), finish=True)
        yield DONE

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
