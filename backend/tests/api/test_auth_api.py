"""Xac thuc / phan quyen o tang API - khong can DB (thay the verifier, lookup, ket noi)."""
import pytest
from fastapi.testclient import TestClient

from app.auth import AuthUser, get_staff_lookup, get_token_verifier
from app.db import get_db
from app.errors import AppError
from app.main import create_app

USERS = {"good": "u-1", "owner": "u-2", "inactive": "u-3", "noprofile": "u-4"}
PROFILES = {
    "u-1": {"ma_nhan_vien": 1, "auth_user_id": "u-1", "ten_dang_nhap": "nv", "ho_ten": "Le Trang", "vai_tro": "NhanVien", "dang_hoat_dong": True},
    "u-2": {"ma_nhan_vien": 2, "auth_user_id": "u-2", "ten_dang_nhap": "chu", "ho_ten": "Anh Thien", "vai_tro": "ChuCuaHang", "dang_hoat_dong": True},
    "u-3": {"ma_nhan_vien": 3, "auth_user_id": "u-3", "ten_dang_nhap": "cu", "ho_ten": "Nghi viec", "vai_tro": "NhanVien", "dang_hoat_dong": False},
}


class FakeVerifier:
    def verify(self, token: str) -> AuthUser:
        if token not in USERS:
            raise AppError(401, "TOKEN_INVALID", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn")
        return AuthUser(id=USERS[token], email=f"{token}@tbike.vn")


@pytest.fixture
def client():
    app = create_app(init_db=False)
    app.dependency_overrides[get_token_verifier] = lambda: FakeVerifier()
    app.dependency_overrides[get_staff_lookup] = lambda: (lambda conn, uid: PROFILES.get(uid))
    app.dependency_overrides[get_db] = lambda: iter([None])
    with TestClient(app) as c:
        yield c


def test_missing_token(client):
    r = client.get("/api/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "AUTH_REQUIRED"


def test_wrong_scheme(client):
    assert client.get("/api/me", headers={"Authorization": "Basic abc"}).status_code == 401


def test_invalid_token(client):
    r = client.get("/api/me", headers={"Authorization": "Bearer nope"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "TOKEN_INVALID"


def test_valid_staff(client):
    r = client.get("/api/me", headers={"Authorization": "Bearer good"})
    assert r.status_code == 200
    assert r.json()["vai_tro"] == "NhanVien" and r.json()["email"] == "good@tbike.vn"


def test_profile_missing(client):
    r = client.get("/api/me", headers={"Authorization": "Bearer noprofile"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "STAFF_PROFILE_NOT_FOUND"


def test_inactive_staff(client):
    r = client.get("/api/me", headers={"Authorization": "Bearer inactive"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "STAFF_INACTIVE"


def test_role_from_db_not_from_client(client):
    # Gui header gia mao vai tro cung khong co tac dung
    r = client.get("/api/staff", headers={"Authorization": "Bearer good", "X-Role": "ChuCuaHang"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "FORBIDDEN_ROLE"


def test_protected_routes_require_auth(client):
    for method, path in [("get", "/api/dashboard/summary"), ("get", "/api/vehicles"), ("get", "/api/maintenance/due"),
                         ("get", "/api/rental-requests"), ("post", "/api/rental-requests/REQ-AAAAAAAA/confirm"),
                         ("patch", "/api/rental-orders/ORD-AAAAAAAA/deposit"), ("post", "/api/rental-orders/ORD-AAAAAAAA/close")]:
        r = client.request(method.upper(), path, json=None if method == "get" else {})
        assert r.status_code == 401, path


def test_validation_error_format(client):
    r = client.post("/api/rental-requests", json={"ma_xe": "TB001"})
    assert r.status_code == 422
    body = r.json()["error"]
    assert body["code"] == "VALIDATION_ERROR" and isinstance(body["details"], list)
