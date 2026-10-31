"""Gioi han tan suat don gian (trong bo nho) cho API cong khai: gui yeu cau, tra cuu.
Chi hieu qua khi chay 1 tien trinh; trien khai nhieu instance can dung kho dung chung (vd Redis)."""
import threading
import time
from collections import deque

from fastapi import Request

from .config import get_settings
from .errors import AppError

_hits: dict[str, deque] = {}
_lock = threading.Lock()


def reset() -> None:
    with _lock:
        _hits.clear()


def rate_limit(bucket: str):
    def _dep(request: Request) -> None:
        limit = get_settings().public_rate_limit_per_minute
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
        key = f"{bucket}:{ip}"
        now = time.monotonic()
        with _lock:
            q = _hits.setdefault(key, deque())
            while q and q[0] <= now - 60:
                q.popleft()
            if len(q) >= limit:
                raise AppError(429, "RATE_LIMITED", "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút")
            q.append(now)

    return _dep
