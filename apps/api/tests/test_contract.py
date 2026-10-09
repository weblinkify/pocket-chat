"""Responses must validate against the committed packages/shared/openapi.json."""

import json
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient
from jsonschema import Draft202012Validator
from referencing import Registry
from referencing.jsonschema import DRAFT202012

from app.main import create_app
from tests.conftest import chat_body
from tests.sse_utils import parse_sse

SPEC_PATH = Path(__file__).resolve().parents[3] / "packages" / "shared" / "openapi.json"
SPEC: dict[str, Any] = json.loads(SPEC_PATH.read_text())
# OpenAPI 3.1 schemas are JSON Schema 2020-12.
REGISTRY: Registry[Any] = Registry().with_resource("spec", DRAFT202012.create_resource(SPEC))


def validate(instance: object, component: str) -> None:
    schema = {"$ref": f"spec#/components/schemas/{component}"}
    Draft202012Validator(schema, registry=REGISTRY).validate(instance)


def test_committed_schema_is_current() -> None:
    assert create_app().openapi() == SPEC, (
        "Run `pnpm openapi` and commit packages/shared/openapi.json"
    )


async def test_health_matches_contract(client: AsyncClient) -> None:
    validate((await client.get("/health")).json(), "Health")


async def test_models_match_contract(client: AsyncClient) -> None:
    validate((await client.get("/v1/models")).json(), "ModelList")


async def test_completion_matches_contract(client: AsyncClient) -> None:
    validate(
        (await client.post("/v1/chat/completions", json=chat_body("hello"))).json(),
        "ChatCompletion",
    )


async def test_every_stream_chunk_matches_contract(client: AsyncClient) -> None:
    res = await client.post("/v1/chat/completions", json=chat_body("code", stream=True))
    events = [e for e in parse_sse(res.text) if e["data"] != "[DONE]"]
    assert len(events) > 2
    for ev in events:
        validate(json.loads(ev["data"]), "ChatCompletionChunk")


@pytest.mark.parametrize(("content", "model"), [("error", "mock-fast"), ("hi", "unknown")])
async def test_errors_match_contract(client: AsyncClient, content: str, model: str) -> None:
    validate(
        (await client.post("/v1/chat/completions", json=chat_body(content, model=model))).json(),
        "ErrorResponse",
    )


def test_validator_rejects_bad_payloads() -> None:
    from jsonschema import ValidationError

    with pytest.raises(ValidationError):
        validate({"object": "list", "data": [{"id": 1}]}, "ModelList")
