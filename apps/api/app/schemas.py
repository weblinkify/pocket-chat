"""API contract. Mirrors packages/shared/src/schemas.ts (zod) via the exported openapi.json."""

from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["system", "user", "assistant"]
FinishReason = Literal["stop", "length"] | None


class ChatMessage(BaseModel):
    role: Role
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = Field(min_length=1, examples=["mock-fast"])
    messages: list[ChatMessage] = Field(min_length=1)
    stream: bool = False
    seed: int | None = None


class Choice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: FinishReason


class ChatCompletion(BaseModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: list[Choice] = Field(min_length=1)


class Delta(BaseModel):
    role: Role | None = None
    content: str | None = None


class ChunkChoice(BaseModel):
    index: int
    delta: Delta
    finish_reason: FinishReason


class ChatCompletionChunk(BaseModel):
    """One `data:` event of a streamed completion (text/event-stream)."""

    id: str
    object: Literal["chat.completion.chunk"] = "chat.completion.chunk"
    created: int
    model: str
    choices: list[ChunkChoice] = Field(min_length=1)


class Model(BaseModel):
    id: str
    object: Literal["model"] = "model"
    owned_by: str
    description: str | None = None


class ModelList(BaseModel):
    object: Literal["list"] = "list"
    data: list[Model]


class ErrorDetail(BaseModel):
    message: str
    type: str
    code: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    provider: str
    version: str
