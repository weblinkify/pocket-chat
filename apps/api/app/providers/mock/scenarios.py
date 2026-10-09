"""Deterministic reply selection for the mock provider.

Mirrors apps/mobile/src/services/chat/mock/replies.ts exactly (same hash, same
keyword rules, same text from packages/shared/mock/replies.json), so the app's
on-device mock and the server behave identically.
"""

import json
import re
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Literal, TypedDict

from app.config import Settings
from app.schemas import ChatMessage, Model


class _Replies(TypedDict):
    codeTypescript: str
    codePython: str
    greeting: str
    pool: list[str]
    smartEpilogue: str


class _ErrorScenario(TypedDict):
    status: int
    message: str


class _Scenarios(TypedDict):
    error: _ErrorScenario


class _ModelEntry(TypedDict):
    id: str
    description: str


class _MockData(TypedDict):
    models: list[_ModelEntry]
    scenarios: _Scenarios
    replies: _Replies


@cache
def load_mock_data(path: Path) -> _MockData:
    data: _MockData = json.loads(path.read_text(encoding="utf-8"))
    return data


_DATA = load_mock_data(Settings().mock_replies_path)

MOCK_MODELS = [
    Model(id=m["id"], owned_by="pocket-chat", description=m["description"]) for m in _DATA["models"]
]


@dataclass(frozen=True)
class MockReply:
    kind: Literal["text", "error", "timeout"]
    text: str = ""
    status: int = 500


def fnv1a(text: str) -> int:
    """FNV-1a over UTF-16 code units, matching the TypeScript implementation."""
    h = 0x811C9DC5
    data = text.encode("utf-16-le", "surrogatepass")
    for i in range(0, len(data), 2):
        h ^= data[i] | (data[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def _has(text: str, word: str) -> bool:
    return re.search(rf"\b{word}\b", text, re.IGNORECASE | re.ASCII) is not None


def pick_reply(messages: list[ChatMessage], model: str, seed: int) -> MockReply:
    last = next((m.content for m in reversed(messages) if m.role == "user"), "")
    replies = _DATA["replies"]

    if _has(last, "error"):
        err = _DATA["scenarios"]["error"]
        return MockReply("error", err["message"], err["status"])
    if _has(last, "slow"):
        return MockReply("timeout")

    if _has(last, "code"):
        text = replies["codePython"] if _has(last, "python") else replies["codeTypescript"]
    elif re.match(r"^\s*(hi|hello|hey)\b", last, re.IGNORECASE | re.ASCII):
        text = replies["greeting"]
    else:
        pool = replies["pool"]
        text = pool[(fnv1a(last) + seed) % len(pool)]

    if model == "mock-smart":
        text += replies["smartEpilogue"]
    return MockReply("text", text)


def chunk_text(text: str, size: int) -> list[str]:
    """Split into chunks of `size` code points."""
    if size < 1:
        raise ValueError("chunk size must be >= 1")
    return [text[i : i + size] for i in range(0, len(text), size)]
