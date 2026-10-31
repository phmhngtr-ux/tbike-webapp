"""Test tich hop tren PostgreSQL THAT (khong mock DB).

Can bien TEST_DATABASE_URL tro toi 1 database RONG danh rieng cho test (vd Postgres cuc bo).
Moi test: xoa sach schema -> chay stub Supabase cuc bo + 2 migration + seed.sql -> tao 3 ho so nhan vien.
Supabase Auth duoc thay bang FakeVerifier (token -> auth_user_id) vi test khong goi Supabase that.
TUYET DOI KHONG tro TEST_DATABASE_URL toi database Supabase dang dung.
"""
import os
import pathlib
import uuid
from datetime import datetime, timedelta, timezone

import psycopg
import pytest
from fastapi.testclient import TestClient

from app import clock, db, rate_limit
from app.auth import AuthUser, get_token_verifier
from app.errors import AppError
from app.main import create_app

TEST_DB = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.integration
ROOT = pathlib.Path(__file__).resolve().parents[3]
SUPA = ROOT / "supabase"
VN = timezone(timedelta(hours=7))

STAFF = {
    "token-nv": (str(uuid.UUID(int=1)), "letrang", "Le Trang", "NhanVien", True),
    "token-owner": (str(uuid.UUID(int=2)), "anhthien", "Anh Thien", "ChuCuaHang", True),
    "token-inactive": (str(uuid.UUID(int=3)), "nghiviec", "Nhan Vien Cu", "NhanVien", False),
    "token-noprofile": (str(uuid.UUID(int=4)), None, None, None, None),
}


def _reset_database(url: str) -> None:
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("drop schema if exists public cascade; create schema public;")
        conn.execute("drop schema if exists auth cascade; drop schema if exists extensions cascade;")
        conn.execute((SUPA / "local" / "00_local_supabase_stub.sql").read_text())
        for f in sorted((SUPA / "migrations").glob("*.sql")):
            conn.execute(f.read_text())
        conn.execute((SUPA / "seed.sql").read_text())
        for token, (uid, username, name, role, active) in STAFF.items():
            conn.execute("insert into auth.users (id, email) values (%s, %s)", (uid, f"{token}@tbike.test"))
            if username:
                conn.execute(
                    "insert into public.tai_khoan_nhan_vien (auth_user_id, ten_dang_nhap, ho_ten, vai_tro, dang_hoat_dong)"
                    " values (%s, %s, %s, %s, %s)",
                    (uid, username, name, role, active),
                )


class FakeVerifier:
    def verify(self, token: str) -> AuthUser:
        if token not in STAFF:
            raise AppError(401, "TOKEN_INVALID", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn")
        return AuthUser(id=STAFF[token][0], email=f"{token}@tbike.test")


@pytest.fixture(scope="session")
def pool():
    if not TEST_DB:
        pytest.skip("Chưa đặt TEST_DATABASE_URL - bỏ qua test tích hợp")
    _reset_database(TEST_DB)
    db.init_pool(TEST_DB, min_size=2, max_size=6)
    yield
    db.close_pool()


class Clock:
    def __init__(self):
        self.value = datetime(2026, 10, 27, 8, 0, tzinfo=VN)

    def set(self, value: datetime):
        self.value = value


@pytest.fixture
def now(monkeypatch):
    c = Clock()
    monkeypatch.setattr(clock, "now", lambda: c.value)
    return c


@pytest.fixture
def client(pool, now):
    _reset_database(TEST_DB)
    rate_limit.reset()
    app = create_app(init_db=False)
    app.dependency_overrides[get_token_verifier] = lambda: FakeVerifier()
    with TestClient(app) as c:
        yield c


def auth(token: str = "token-nv") -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sql():
    """Chay SQL truc tiep (ngoai API) de chuan bi / kiem tra du lieu."""
    def _run(query: str, params=None, fetch: bool = True):
        with psycopg.connect(TEST_DB, autocommit=True) as conn:
            cur = conn.execute(query, params)
            return cur.fetchall() if fetch and cur.description else None
    return _run
