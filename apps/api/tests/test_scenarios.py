from hypothesis import given
from hypothesis import strategies as st

from app.providers.mock.scenarios import MOCK_MODELS, chunk_text, fnv1a, pick_reply
from app.schemas import ChatMessage


def user(content: str) -> list[ChatMessage]:
    return [ChatMessage(role="user", content=content)]


# Reference values computed by the TypeScript mock (apps/mobile replies.ts) to prove parity.
def test_hash_matches_typescript() -> None:
    assert fnv1a("") == 2166136261
    assert fnv1a("hello") == 1335831723
    assert fnv1a("tell me more") == 643705373
    assert fnv1a("héllo 👋") == 418821089  # surrogate pair hashed as UTF-16 code units
    assert fnv1a("Compare a few options for me") == 93288110


def test_pool_selection_matches_typescript() -> None:
    expected = {
        1: "Here's a mental model I find u",
        42: "Great question. Here's a quick",
        43: "Sure! Here are a few ideas to ",
        44: "Here's how I'd approach it:\n\n*",
    }
    for seed, prefix in expected.items():
        reply = pick_reply(user("tell me more"), "mock-fast", seed)
        assert reply.kind == "text"
        assert reply.text.startswith(prefix)


def test_keyword_scenarios() -> None:
    assert pick_reply(user("trigger an ERROR!"), "mock-fast", 1).kind == "error"
    assert pick_reply(user("be slow"), "mock-fast", 1).kind == "timeout"
    assert "```typescript" in pick_reply(user("show me code"), "mock-fast", 1).text
    assert "```python" in pick_reply(user("python code"), "mock-fast", 1).text
    assert "Pocket Chat" in pick_reply(user("hello"), "mock-fast", 1).text


def test_word_boundaries_and_last_user_message() -> None:
    assert pick_reply(user("terrorist movie plot"), "mock-fast", 1).kind == "text"
    msgs = [
        ChatMessage(role="user", content="error"),
        ChatMessage(role="assistant", content="oops"),
        ChatMessage(role="user", content="hello"),
    ]
    assert pick_reply(msgs, "mock-fast", 1).kind == "text"


def test_no_user_message_falls_back_to_pool() -> None:
    assert (
        pick_reply([ChatMessage(role="system", content="be nice")], "mock-fast", 1).kind == "text"
    )


def test_smart_model_is_longer() -> None:
    fast = pick_reply(user("explain"), "mock-fast", 3).text
    smart = pick_reply(user("explain"), "mock-smart", 3).text
    assert len(smart) > len(fast)


def test_models() -> None:
    assert [m.id for m in MOCK_MODELS] == ["mock-fast", "mock-smart"]


@given(st.text(), st.integers(min_value=1, max_value=50))
def test_chunks_rejoin_to_original(text: str, size: int) -> None:
    chunks = chunk_text(text, size)
    assert "".join(chunks) == text
    assert all(1 <= len(c) <= size for c in chunks)


def test_chunk_size_must_be_positive() -> None:
    try:
        chunk_text("abc", 0)
    except ValueError:
        return
    raise AssertionError("expected ValueError")
