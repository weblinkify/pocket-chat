import json

import anthropic
import httpx2
import openai
import pytest

from app.providers.anthropic_provider import FALLBACK_BETA, AnthropicProvider
from app.providers.base import ModelNotFoundError, ProviderError
from app.providers.factory import build_provider
from app.providers.mock.provider import MockProvider
from app.providers.openai_provider import OpenAIProvider
from app.schemas import ChatMessage
from tests.conftest import make_settings

MSGS = [ChatMessage(role="system", content="Be brief."), ChatMessage(role="user", content="Hi")]


async def collect(
    provider: OpenAIProvider | AnthropicProvider, model: str, seed: int | None = None
) -> str:
    return "".join([t async for t in provider.stream(model, MSGS, seed)])


# --------------------------------------------------------------------- factory


def test_factory_picks_provider_from_env_flag() -> None:
    assert isinstance(build_provider(make_settings()), MockProvider)
    assert isinstance(
        build_provider(make_settings(llm_provider="openai", openai_api_key="k")), OpenAIProvider
    )
    assert isinstance(
        build_provider(make_settings(llm_provider="anthropic", anthropic_api_key="k")),
        AnthropicProvider,
    )


async def test_mock_rejects_unknown_model() -> None:
    with pytest.raises(ModelNotFoundError):
        [t async for t in MockProvider(make_settings()).stream("nope", MSGS, None)]


# ---------------------------------------------------------------------- OpenAI


def openai_sse(*deltas: str) -> str:
    lines = [
        "data: "
        + json.dumps(
            {
                "id": "c1",
                "object": "chat.completion.chunk",
                "created": 1,
                "model": "gpt-4o-mini",
                "choices": [{"index": 0, "delta": {"content": d}, "finish_reason": None}],
            }
        )
        for d in deltas
    ]
    return "\n\n".join([*lines, "data: [DONE]"]) + "\n\n"


def openai_client(transport: httpx2.MockTransport) -> openai.AsyncOpenAI:
    # openai 3.x (like anthropic 1.x) runs on httpx2, so mock the transport rather than respx.
    return openai.AsyncOpenAI(
        api_key="sk-test",
        max_retries=0,
        http_client=openai.DefaultAsyncHttpx2Client(transport=transport),
    )


async def test_openai_streams_and_sends_history() -> None:
    seen: list[httpx2.Request] = []

    def handle(request: httpx2.Request) -> httpx2.Response:
        seen.append(request)
        return httpx2.Response(
            200, text=openai_sse("Hel", "lo"), headers={"content-type": "text/event-stream"}
        )

    provider = OpenAIProvider(make_settings(), client=openai_client(httpx2.MockTransport(handle)))
    assert await collect(provider, "gpt-4o-mini", seed=7) == "Hello"
    sent = json.loads(seen[0].content)
    assert str(seen[0].url) == "https://api.openai.com/v1/chat/completions"
    assert sent["stream"] is True
    assert sent["seed"] == 7
    assert sent["messages"][0] == {"role": "system", "content": "Be brief."}
    assert [m.id for m in await provider.list_models()] == ["gpt-4o-mini"]


async def test_openai_maps_api_errors() -> None:
    def handle(_: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(
            401, json={"error": {"message": "bad key", "type": "invalid_request_error"}}
        )

    provider = OpenAIProvider(make_settings(), client=openai_client(httpx2.MockTransport(handle)))
    with pytest.raises(ProviderError) as exc:
        await collect(provider, "gpt-4o-mini")
    assert exc.value.status_code == 502


async def test_openai_maps_connection_errors() -> None:
    def handle(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.ConnectError("down", request=request)

    provider = OpenAIProvider(make_settings(), client=openai_client(httpx2.MockTransport(handle)))
    with pytest.raises(ProviderError, match="Could not reach"):
        await collect(provider, "gpt-4o-mini")


async def test_openai_rejects_other_models() -> None:
    with pytest.raises(ModelNotFoundError):
        await collect(OpenAIProvider(make_settings(openai_api_key="k")), "gpt-9")


# ------------------------------------------------------------------- Anthropic
# anthropic 1.x runs on httpx2, so mock at the transport.


def anthropic_sse(text_parts: list[str], stop_reason: str = "end_turn") -> bytes:
    events: list[tuple[str, dict[str, object]]] = [
        (
            "message_start",
            {
                "type": "message_start",
                "message": {
                    "id": "msg_1",
                    "type": "message",
                    "role": "assistant",
                    "model": "claude-opus-5-5",
                    "content": [],
                    "stop_reason": None,
                    "stop_sequence": None,
                    "usage": {"input_tokens": 5, "output_tokens": 1},
                },
            },
        ),
        (
            "content_block_start",
            {
                "type": "content_block_start",
                "index": 0,
                "content_block": {"type": "text", "text": ""},
            },
        ),
        *[
            (
                "content_block_delta",
                {
                    "type": "content_block_delta",
                    "index": 0,
                    "delta": {"type": "text_delta", "text": t},
                },
            )
            for t in text_parts
        ],
        ("content_block_stop", {"type": "content_block_stop", "index": 0}),
        (
            "message_delta",
            {
                "type": "message_delta",
                "delta": {"stop_reason": stop_reason, "stop_sequence": None},
                "usage": {"output_tokens": 3},
            },
        ),
        ("message_stop", {"type": "message_stop"}),
    ]
    return "".join(f"event: {name}\ndata: {json.dumps(data)}\n\n" for name, data in events).encode()


def anthropic_client(handler: httpx2.MockTransport) -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(
        api_key="sk-ant-test",
        max_retries=0,
        http_client=anthropic.DefaultAsyncHttpxClient(transport=handler),
    )


async def test_anthropic_streams_with_fallbacks_and_system_prompt() -> None:
    seen: list[httpx2.Request] = []

    def handle(request: httpx2.Request) -> httpx2.Response:
        seen.append(request)
        return httpx2.Response(
            200, content=anthropic_sse(["Hel", "lo"]), headers={"content-type": "text/event-stream"}
        )

    provider = AnthropicProvider(
        make_settings(), client=anthropic_client(httpx2.MockTransport(handle))
    )
    assert await collect(provider, "claude-opus-5-5") == "Hello"
    body = json.loads(seen[0].content)
    assert body["model"] == "claude-opus-5-5"
    assert body["stream"] is True
    assert body["system"] == "Be brief."
    assert body["messages"] == [{"role": "user", "content": "Hi"}]
    assert body["fallbacks"] == "default"
    assert body["output_config"] == {"effort": "medium"}
    assert FALLBACK_BETA in seen[0].headers["anthropic-beta"]
    assert [m.id for m in await provider.list_models()] == ["claude-opus-5-5"]


async def test_anthropic_reports_refusals() -> None:
    def handle(_: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(
            200,
            content=anthropic_sse(["I can't"], "refusal"),
            headers={"content-type": "text/event-stream"},
        )

    provider = AnthropicProvider(
        make_settings(), client=anthropic_client(httpx2.MockTransport(handle))
    )
    with pytest.raises(ProviderError) as exc:
        await collect(provider, "claude-opus-5-5")
    assert exc.value.type == "refusal"


async def test_anthropic_maps_api_errors() -> None:
    def handle(_: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(
            529, json={"type": "error", "error": {"type": "overloaded_error", "message": "busy"}}
        )

    provider = AnthropicProvider(
        make_settings(), client=anthropic_client(httpx2.MockTransport(handle))
    )
    with pytest.raises(ProviderError) as exc:
        await collect(provider, "claude-opus-5-5")
    assert exc.value.status_code == 502


async def test_anthropic_maps_connection_errors() -> None:
    def handle(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.ConnectError("down", request=request)

    provider = AnthropicProvider(
        make_settings(), client=anthropic_client(httpx2.MockTransport(handle))
    )
    with pytest.raises(ProviderError, match="Could not reach"):
        await collect(provider, "claude-opus-5-5")


async def test_anthropic_rejects_other_models() -> None:
    with pytest.raises(ModelNotFoundError):
        await collect(AnthropicProvider(make_settings(anthropic_api_key="k")), "gpt-4o")
