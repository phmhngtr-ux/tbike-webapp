"""Sinh ma yeu cau / ma don thue.

varchar(12) trong schema -> 'REQ-' + 8 ky tu ngau nhien (khong tuan tu, kho doan).
Bo ky tu de nham lan (0/O, 1/I/L). Ma don thue dung chung hau to voi ma yeu cau.
"""
import re
import secrets

_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
_SUFFIX_LEN = 8
REQUEST_CODE_RE = re.compile(r"^REQ-[0-9A-Z]{8}$")
ORDER_CODE_RE = re.compile(r"^ORD-[0-9A-Z]{8}$")


def make_request_code() -> str:
    return "REQ-" + "".join(secrets.choice(_ALPHABET) for _ in range(_SUFFIX_LEN))


def order_code_for(ma_yeu_cau: str) -> str:
    if not REQUEST_CODE_RE.match(ma_yeu_cau):
        raise ValueError("Mã yêu cầu không đúng định dạng")
    return "ORD-" + ma_yeu_cau[4:]
