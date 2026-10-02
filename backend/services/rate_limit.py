"""In-memory sliding-window rate limiter.

Good enough for a single backend instance (the current Render setup). If the
backend is ever scaled to several instances, each one keeps its own counts,
so the effective limit multiplies; move this to Redis/Upstash at that point.
"""

import threading
import time
from collections import deque


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Records a hit for `key` and returns False if it is over the limit."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self.max_requests:
                return False
            hits.append(now)
            if len(self._hits) > 10_000:
                self._prune(cutoff)
            return True

    def _prune(self, cutoff: float) -> None:
        for key in [k for k, v in self._hits.items() if not v or v[-1] <= cutoff]:
            del self._hits[key]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


# Login: per IP and per account, so one attacker can't hammer one account
# from many IPs and one IP can't spray many accounts.
login_ip_limiter = RateLimiter(max_requests=20, window_seconds=300)
login_identifier_limiter = RateLimiter(max_requests=10, window_seconds=900)
register_ip_limiter = RateLimiter(max_requests=5, window_seconds=3600)
refresh_ip_limiter = RateLimiter(max_requests=60, window_seconds=300)
