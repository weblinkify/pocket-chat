"""Server-Sent Events framing (see ADR 0003)."""

DONE = "data: [DONE]\n\n"


def sse_event(data: str, event: str | None = None) -> str:
    lines = [f"event: {event}"] if event else []
    lines += [f"data: {line}" for line in data.split("\n")]
    return "\n".join(lines) + "\n\n"
