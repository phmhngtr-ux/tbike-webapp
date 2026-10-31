"""Xac thuc & phan quyen nhan vien.

1. Lay access token tu header "Authorization: Bearer <token>".
2. Xac minh token voi Supabase Auth (GET {SUPABASE_URL}/auth/v1/user). Cach nay dung duoc
   cho ca khoa ky JWT kieu cu (HS256) lan khoa bat doi xung moi, va phat hien phien da dang xuat.
   Ket qua duoc cache ngan (AUTH_CACHE_SECONDS) de giam so lan goi.
3. Anh xa auth user -> tai_khoan_nhan_vien.auth_user_id. Vai tro lay tu DB, KHONG tin frontend.
"""
import hashlib
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass

import httpx
from fastapi import Depends, Request
from psycopg import Connection

from .config import get_settings
from .db import get_db
from .errors import AppError


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None


@dataclass(frozen=True)
class CurrentStaff:
    ma_nhan_vien: int
    auth_user_id: str
    ten_dang_nhap: str
    ho_ten: str
    vai_tro: str
    email: str | None


class SupabaseTokenVerifier:
    def __init__(self, supabase_url: str, anon_key: str, cache_seconds: int = 30, timeout: float = 5.0):
        self._url = supabase_url.rstrip("/") + "/auth/v1/user"
        self._anon_key = anon_key
        self._cache_seconds = cache_seconds
        self._timeout = timeout
        self._cache: dict[str, tuple[float, AuthUser]] = {}
        self._lock = threading.Lock()

    def verify(self, token: str) -> AuthUser:
        if not self._anon_key or not self._url.startswith("http"):
            raise AppError(503, "AUTH_NOT_CONFIGURED", "Máy chủ chưa cấu hình Supabase Auth")
        key = hashlib.sha256(token.encode()).hexdigest()
        now = time.monotonic()
        with self._lock:
            hit = self._cache.get(key)
            if hit and hit[0] > now:
                return hit[1]
        try:
            resp = httpx.get(
                self._url,
                headers={"apikey": self._anon_key, "Authorization": f"Bearer {token}"},
                timeout=self._timeout,
            )
        except httpx.HTTPError as exc:
            raise AppError(503, "AUTH_UNAVAILABLE", "Không kết nối được dịch vụ xác thực") from exc
        if resp.status_code in (401, 403):
            raise AppError(401, "TOKEN_INVALID", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn")
        if resp.status_code != 200:
            raise AppError(503, "AUTH_UNAVAILABLE", "Dịch vụ xác thực đang gặp sự cố")
        data = resp.json()
        user = AuthUser(id=str(data["id"]), email=data.get("email"))
        with self._lock:
            self._cache[key] = (now + self._cache_seconds, user)
            if len(self._cache) > 5000:
                self._cache = {k: v for k, v in self._cache.items() if v[0] > now}
        return user


_verifier: SupabaseTokenVerifier | None = None


def get_token_verifier() -> SupabaseTokenVerifier:
    global _verifier
    if _verifier is None:
        s = get_settings()
        _verifier = SupabaseTokenVerifier(s.supabase_url, s.supabase_anon_key, s.auth_cache_seconds)
    return _verifier


def lookup_staff_by_auth_id(conn: Connection, auth_user_id: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            """select ma_nhan_vien, auth_user_id::text as auth_user_id, ten_dang_nhap, ho_ten,
                      vai_tro::text as vai_tro, dang_hoat_dong
               from public.tai_khoan_nhan_vien where auth_user_id = %s""",
            (auth_user_id,),
        )
        return cur.fetchone()


def get_staff_lookup() -> Callable[[Connection, str], dict | None]:
    return lookup_staff_by_auth_id


def _bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise AppError(401, "AUTH_REQUIRED", "Vui lòng đăng nhập để tiếp tục")
    return token.strip()


def get_current_staff(
    request: Request,
    conn: Connection = Depends(get_db),
    verifier: SupabaseTokenVerifier = Depends(get_token_verifier),
    lookup: Callable[[Connection, str], dict | None] = Depends(get_staff_lookup),
) -> CurrentStaff:
    token = _bearer_token(request)
    user = verifier.verify(token)
    row = lookup(conn, user.id)
    if row is None:
        raise AppError(403, "STAFF_PROFILE_NOT_FOUND", "Tài khoản chưa được cấp quyền truy cập khu vực vận hành")
    if not row["dang_hoat_dong"]:
        raise AppError(403, "STAFF_INACTIVE", "Tài khoản nhân viên đã bị khóa")
    return CurrentStaff(
        ma_nhan_vien=row["ma_nhan_vien"],
        auth_user_id=row["auth_user_id"],
        ten_dang_nhap=row["ten_dang_nhap"],
        ho_ten=row["ho_ten"],
        vai_tro=row["vai_tro"],
        email=user.email,
    )


def require_roles(*roles: str):
    allowed = set(roles)

    def _dep(staff: CurrentStaff = Depends(get_current_staff)) -> CurrentStaff:
        if staff.vai_tro not in allowed:
            raise AppError(403, "FORBIDDEN_ROLE", "Bạn không có quyền thực hiện thao tác này")
        return staff

    return _dep


# Moi nhan vien dang hoat dong (ca 2 vai tro)
any_staff = require_roles("ChuCuaHang", "NhanVien")
owner_only = require_roles("ChuCuaHang")
