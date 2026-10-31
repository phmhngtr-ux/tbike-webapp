"""Kiem tra va chuan hoa du lieu dau vao dung chung."""
import re

PHONE_RE = re.compile(r"^0\d{9,10}$")  # 10-11 chu so, khop varchar(11)


def normalize_phone(value: str) -> str:
    cleaned = re.sub(r"[\s.\-()]", "", value or "")
    if cleaned.startswith("+84"):
        cleaned = "0" + cleaned[3:]
    if not PHONE_RE.match(cleaned):
        raise ValueError("Số điện thoại gồm 10–11 chữ số và bắt đầu bằng 0")
    return cleaned


def clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    v = re.sub(r"\s+", " ", value).strip()
    return v or None


def mask_name(full_name: str) -> str:
    """Che ten khach khi tra cuu cong khai: 'Nguyen Minh Anh' -> 'N*** M*** Anh'."""
    parts = full_name.split()
    if len(parts) <= 1:
        return (full_name[:1] + "***") if full_name else ""
    return " ".join([p[0] + "***" for p in parts[:-1]] + [parts[-1]])
