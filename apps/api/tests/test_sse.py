from hypothesis import given
from hypothesis import strategies as st

from app.sse import DONE, sse_event
from tests.sse_utils import parse_sse


def test_single_line_event() -> None:
    assert sse_event("hi") == "data: hi\n\n"


def test_named_multiline_event() -> None:
    assert sse_event("a\nb", event="error") == "event: error\ndata: a\ndata: b\n\n"


def test_done_sentinel() -> None:
    assert DONE == "data: [DONE]\n\n"


@given(
    st.lists(
        st.text(alphabet=st.characters(blacklist_categories=["Cs"], blacklist_characters="\r")),
        max_size=8,
    )
)
def test_roundtrip_through_a_parser(payloads: list[str]) -> None:
    payloads = [p for p in payloads if p != ""]
    raw = "".join(sse_event(p) for p in payloads)
    assert [e["data"] for e in parse_sse(raw)] == payloads


@given(st.text(min_size=1), st.lists(st.integers(min_value=0), max_size=10))
def test_arbitrary_network_splits_do_not_change_events(text: str, cuts: list[int]) -> None:
    """However the byte stream is split, rejoining it yields the same events."""
    raw = sse_event(text.replace("\r", "")) + DONE
    points = sorted({c % (len(raw) + 1) for c in cuts})
    pieces = [raw[i:j] for i, j in zip([0, *points], [*points, len(raw)], strict=True)]
    assert parse_sse("".join(pieces)) == parse_sse(raw)
