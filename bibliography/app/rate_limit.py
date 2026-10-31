"""Per-IP limit for the public study tools.

Caddy replaces X-Forwarded-For with the client that connected to the site,
so the first hop is the visitor. Health checks are not counted.
"""

import time
from collections.abc import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# --- Limit ---
LIMIT = 30
WINDOW_SECONDS = 60


class ToolRateLimit:
    def __init__(self, limit: int = LIMIT, window_seconds: int = WINDOW_SECONDS, now: Callable[[], float] | None = None) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.now = time.time if now is None else now
        self.counts: dict[str, tuple[int, int]] = {}

    def allow(self, ip: str) -> bool:
        start = int(self.now() // self.window_seconds)
        window, count = self.counts.get(ip, (start, 0))
        if window != start:
            window, count = start, 0
        if count >= self.limit:
            self.counts[ip] = (window, count)
            return False
        self.counts[ip] = (window, count + 1)
        if len(self.counts) > 5000:
            self.counts = {key: value for key, value in self.counts.items() if value[0] == start}
        return True


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        hop = forwarded.split(",")[0].strip()
        if hop:
            return hop[:64]
    if request.client is not None and request.client.host:
        return request.client.host
    return "unknown"


class ToolRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limiter: ToolRateLimit | None = None) -> None:
        super().__init__(app)
        self.limiter = ToolRateLimit() if limiter is None else limiter

    async def dispatch(self, request: Request, call_next):
        if request.method != "POST":
            return await call_next(request)
        if not self.limiter.allow(client_ip(request)):
            return JSONResponse({"detail": "too_many_requests"}, status_code=429)
        return await call_next(request)
