"""Request counts for one study tool.

Health and metrics reads are not included. The error rate is since the
process started. Latency percentiles use the latest samples only.
"""

import math
import threading
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class ToolMetrics:
    def __init__(self, sample_limit: int = 256) -> None:
        self.sample_limit = sample_limit
        self.requests = 0
        self.errors = 0
        self.samples: list[int] = []
        self._lock = threading.Lock()

    def record(self, status: int, elapsed_ms: int) -> None:
        with self._lock:
            self.requests += 1
            if status >= 500:
                self.errors += 1
            self.samples.append(max(0, elapsed_ms))
            if len(self.samples) > self.sample_limit:
                self.samples = self.samples[-self.sample_limit :]

    def snapshot(self, service: str) -> dict[str, int | float | str]:
        with self._lock:
            requests = self.requests
            errors = self.errors
            samples = list(self.samples)
        return {
            "service": service,
            "requests": requests,
            "errors": errors,
            "errorRate": 0.0 if requests == 0 else round(errors / requests, 3),
            "latencyMsP50": _percentile(samples, 50),
            "latencyMsP95": _percentile(samples, 95),
        }


def _percentile(samples: list[int], percent: int) -> int:
    if not samples:
        return 0
    ordered = sorted(samples)
    index = math.ceil(percent / 100 * len(ordered)) - 1
    return ordered[min(len(ordered) - 1, max(0, index))]


metrics = ToolMetrics()


class ToolMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if path.endswith("/health") or path.endswith("/metrics"):
            return await call_next(request)
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            metrics.record(500, _elapsed_ms(started))
            raise
        metrics.record(response.status_code, _elapsed_ms(started))
        return response


def _elapsed_ms(started: float) -> int:
    return int((time.perf_counter() - started) * 1000)
