"""A tiny, independent SSE decoder used to check what the API emits."""

import json
from typing import Any


def parse_sse(raw: str) -> list[dict[str, str]]:
    events: list[dict[str, str]] = []
    data: list[str] = []
    event: str | None = None
    for line in raw.replace("\r\n", "\n").split("\n"):
        if line == "":
            if data:
                ev = {"data": "\n".join(data)}
                if event:
                    ev["event"] = event
                events.append(ev)
            data, event = [], None
        elif line.startswith(":"):
            continue
        elif line.startswith("data:"):
            data.append(line[5:].removeprefix(" "))
        elif line.startswith("event:"):
            event = line[6:].strip()
    return events


def deltas(raw: str) -> list[str]:
    out: list[str] = []
    for ev in parse_sse(raw):
        if ev["data"] == "[DONE]" or ev.get("event") == "error":
            continue
        chunk: dict[str, Any] = json.loads(ev["data"])
        content = chunk["choices"][0]["delta"].get("content")
        if content:
            out.append(content)
    return out
