import json
from collections.abc import Callable

import pytest
from httpx import AsyncClient

from tests.conftest import chat_body
from tests.sse_utils import deltas, parse_sse


async def test_health(client: AsyncClient) -> None:
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "provider": "mock", "version": "0.1.0"}


async def test_models(client: AsyncClient) -> None:
    res = await client.get("/v1/models")
    body = res.json()
    assert body["object"] == "list"
    assert [m["id"] for m in body["data"]] == ["mock-fast", "mock-smart"]


async def test_non_streaming_completion(client: AsyncClient) -> None:
    res = await client.post("/v1/chat/completions", json=chat_body("hello"))
    assert res.status_code == 200
    body = res.json()
    assert body["object"] == "chat.completion"
    assert body["model"] == "mock-fast"
    assert body["id"].startswith("chatcmpl-")
    choice = body["choices"][0]
    assert choice["finish_reason"] == "stop"
    assert choice["message"]["role"] == "assistant"
    assert "Pocket Chat" in choice["message"]["content"]


async def test_streaming_completion(client: AsyncClient) -> None:
    res = await client.post("/v1/chat/completions", json=chat_body("hello", stream=True))
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    assert res.headers["cache-control"] == "no-cache"
    events = parse_sse(res.text)
    assert events[-1]["data"] == "[DONE]"
    first = json.loads(events[0]["data"])
    assert first["object"] == "chat.completion.chunk"
    assert first["choices"][0]["delta"]["role"] == "assistant"
    last_chunk = json.loads(events[-2]["data"])
    assert last_chunk["choices"][0]["finish_reason"] == "stop"
    full = (await client.post("/v1/chat/completions", json=chat_body("hello"))).json()
    assert "".join(deltas(res.text)) == full["choices"][0]["message"]["content"]


async def test_streaming_and_non_streaming_agree_for_every_seed(client: AsyncClient) -> None:
    for seed in range(5):
        s = await client.post(
            "/v1/chat/completions", json=chat_body("tell me", stream=True, seed=seed)
        )
        n = await client.post("/v1/chat/completions", json=chat_body("tell me", seed=seed))
        assert "".join(deltas(s.text)) == n.json()["choices"][0]["message"]["content"]


@pytest.mark.parametrize("stream", [True, False])
async def test_error_scenario_returns_500(client: AsyncClient, stream: bool) -> None:
    res = await client.post("/v1/chat/completions", json=chat_body("error", stream=stream))
    assert res.status_code == 500
    assert res.json() == {
        "error": {
            "message": "The mock provider simulated an internal error.",
            "type": "server_error",
            "code": None,
        }
    }


async def test_slow_scenario_times_out(client: AsyncClient) -> None:
    res = await client.post("/v1/chat/completions", json=chat_body("slow"))
    assert res.status_code == 504
    assert res.json()["error"]["type"] == "timeout"


async def test_unknown_model_is_404(client: AsyncClient) -> None:
    res = await client.post("/v1/chat/completions", json=chat_body("hi", model="gpt-9"))
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "model_not_found"


async def test_validation_errors_use_the_error_envelope(client: AsyncClient) -> None:
    res = await client.post("/v1/chat/completions", json={"model": "mock-fast", "messages": []})
    assert res.status_code == 422
    assert res.json()["error"]["type"] == "invalid_request_error"


async def test_unknown_route_uses_the_error_envelope(client: AsyncClient) -> None:
    res = await client.get("/nope")
    assert res.status_code == 404
    assert res.json()["error"]["type"] == "not_found"


async def test_request_id_is_generated_and_echoed(client: AsyncClient) -> None:
    generated = await client.get("/health")
    assert len(generated.headers["x-request-id"]) == 32
    echoed = await client.get("/health", headers={"X-Request-ID": "abc-123"})
    assert echoed.headers["x-request-id"] == "abc-123"


async def test_overlong_request_ids_are_replaced(client: AsyncClient) -> None:
    res = await client.get("/health", headers={"X-Request-ID": "x" * 500})
    assert res.headers["x-request-id"] != "x" * 500


async def test_cors_preflight(client: AsyncClient) -> None:
    res = await client.options(
        "/v1/chat/completions",
        headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST"},
    )
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] in {"*", "http://localhost:8081"}


async def test_rate_limit(client_for: Callable[..., AsyncClient]) -> None:
    async with client_for(rate_limit="2/minute") as c:
        assert (await c.post("/v1/chat/completions", json=chat_body("hi"))).status_code == 200
        assert (await c.post("/v1/chat/completions", json=chat_body("hi"))).status_code == 200
        limited = await c.post("/v1/chat/completions", json=chat_body("hi"))
        assert limited.status_code == 429
        assert limited.json()["error"]["type"] == "rate_limit_exceeded"
        assert int(limited.headers["retry-after"]) >= 1
        # Health checks are never rate limited.
        assert (await c.get("/health")).status_code == 200
