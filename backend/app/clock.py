"""Nguon thoi gian duy nhat cua backend (test co the thay the)."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")


def now() -> datetime:
    return datetime.now(timezone.utc)
