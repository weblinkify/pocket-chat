import math
import time
from collections.abc import Callable

from fastapi import Request

from app.providers.base import ProviderError

_UNITS = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}


class RateLimitExceededError(ProviderError):
    def __init__(self, retry_after: int) -> None:
        super().__init__(
            "Too many requests. Please slow down.",
            status_code=429,
            error_type="rate_limit_exceeded",
        )
        self.retry_after = retry_after


def parse_limit(spec: str) -> tuple[int, int]:
    """'60/minute' -> (60, 60)."""
    count, _, unit = spec.partition("/")
    return int(count), _UNITS[unit.strip().removesuffix("s")]


class RateLimiter:
    """Fixed-window, per-client-IP limiter.

    In-memory, which suits a single instance; back it with Redis to scale out.
    """

    def __init__(self, spec: str, clock: Callable[[], float] = time.monotonic) -> None:
        self.limit, self.window = parse_limit(spec)
        self._clock = clock
        self._hits: dict[str, tuple[float, int]] = {}

    def check(self, key: str) -> None:
        now = self._clock()
        start, count = self._hits.get(key, (now, 0))
        if now - start >= self.window:
            start, count = now, 0
        if count >= self.limit:
            raise RateLimitExceededError(max(1, math.ceil(self.window - (now - start))))
        self._hits[key] = (start, count + 1)

    async def __call__(self, request: Request) -> None:
        self.check(request.client.host if request.client else "unknown")
