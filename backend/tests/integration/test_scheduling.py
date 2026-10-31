"""Trung lich, xac nhan dong thoi, tu choi, gui yeu cau khong hop le."""
import threading
from datetime import datetime

import psycopg
import pytest

from app import db
from app.auth import CurrentStaff
from app.errors import AppError
from app.schemas import ConfirmRequest
from app.services import rentals

from .conftest import TEST_DB, VN, auth


def iso(*a):
    return datetime(*a, tzinfo=VN).isoformat()


def create(client, ma_xe, start, end, phone="0911111111"):
    r = client.post("/api/rental-requests", json={
        "ma_xe": ma_xe, "ho_ten_khach": "Khach Test", "so_dien_thoai": phone,
        "thoi_gian_nhan_du_kien": start, "thoi_gian_tra_du_kien": end})
    assert r.status_code == 201, r.text
    return r.json()["ma_yeu_cau"]


def test_confirm_blocked_by_overlap_with_active_order(client):
    # REQ-00000003: TB002 27/10 12:00 -> 28/10 10:00, trung voi ORD-00000002 dang thue
    r = client.post("/api/rental-requests/REQ-00000003/confirm", json={}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "SCHEDULE_CONFLICT"
    assert r.json()["error"]["details"]["don_trung"] == ["ORD-00000002"]
    req = client.get("/api/rental-requests/REQ-00000003", headers=auth()).json()
    assert req["co_trung_lich"] is True and req["trang_thai_xu_ly"] == "DaGui"


def test_adjacent_bookings_are_not_conflicts(client):
    a = client.post("/api/rental-requests/REQ-00000001/confirm", json={}, headers=auth())  # TB001 28/10 08:00 -> 29/10 08:00
    assert a.status_code == 200, a.text
    code = create(client, "TB001", iso(2026, 10, 29, 8), iso(2026, 10, 30, 8))
    b = client.post(f"/api/rental-requests/{code}/confirm", json={}, headers=auth())
    assert b.status_code == 200, b.text


def test_public_create_rejects_unavailable(client):
    r = client.post("/api/rental-requests", json={
        "ma_xe": "TB002", "ho_ten_khach": "Khach", "so_dien_thoai": "0912345678",
        "thoi_gian_nhan_du_kien": iso(2026, 10, 27, 20), "thoi_gian_tra_du_kien": iso(2026, 10, 28, 8)})
    assert r.status_code == 409 and r.json()["error"]["code"] == "VEHICLE_UNAVAILABLE"
    r = client.post("/api/rental-requests", json={
        "ma_xe": "TB003", "ho_ten_khach": "Khach", "so_dien_thoai": "0912345678",
        "thoi_gian_nhan_du_kien": iso(2026, 11, 1, 8), "thoi_gian_tra_du_kien": iso(2026, 11, 2, 8)})
    assert r.status_code == 409  # CanBaoDuong
    r = client.post("/api/rental-requests", json={
        "ma_xe": "TB001", "ho_ten_khach": "Khach", "so_dien_thoai": "0912345678",
        "thoi_gian_nhan_du_kien": iso(2026, 10, 26, 8), "thoi_gian_tra_du_kien": iso(2026, 10, 27, 8)})
    assert r.status_code == 422 and r.json()["error"]["code"] == "PICKUP_IN_PAST"
    r = client.post("/api/rental-requests", json={
        "ma_xe": "KHONGCO", "ho_ten_khach": "Khach", "so_dien_thoai": "0912345678",
        "thoi_gian_nhan_du_kien": iso(2026, 11, 1, 8), "thoi_gian_tra_du_kien": iso(2026, 11, 2, 8)})
    assert r.status_code == 404


def test_reject_needs_reason_and_is_final(client):
    r = client.post("/api/rental-requests/REQ-00000001/reject", json={"ly_do": " "}, headers=auth())
    assert r.status_code == 422
    r = client.post("/api/rental-requests/REQ-00000001/reject", json={"ly_do": "Khach huy qua dien thoai"}, headers=auth())
    assert r.status_code == 200 and r.json()["trang_thai_xu_ly"] == "TuChoi"
    r = client.post("/api/rental-requests/REQ-00000001/confirm", json={}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "INVALID_STATE"


def test_concurrent_confirm_only_one_wins(client):
    a = create(client, "TB004", iso(2026, 11, 3, 8), iso(2026, 11, 4, 8), "0911111111")
    b = create(client, "TB004", iso(2026, 11, 3, 20), iso(2026, 11, 5, 8), "0922222222")
    staff = CurrentStaff(1, "x", "letrang", "Le Trang", "NhanVien", None)
    barrier = threading.Barrier(2)
    results = {}

    def run(code):
        with db._pool.connection() as conn:
            barrier.wait()
            try:
                rentals.confirm(conn, code, ConfirmRequest(), staff)
                results[code] = "ok"
            except AppError as e:
                conn.rollback()
                results[code] = e.code

    threads = [threading.Thread(target=run, args=(c,)) for c in (a, b)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(results.values()) == ["SCHEDULE_CONFLICT", "ok"]


def test_exclusion_constraint_is_last_line_of_defence(client, sql):
    with pytest.raises(psycopg.errors.ExclusionViolation):
        sql("""insert into public.yeu_cau_thue (ma_yeu_cau, ma_don_thue, ma_xe, ho_ten_khach, so_dien_thoai,
                 thoi_gian_nhan_du_kien, thoi_gian_tra_du_kien, don_gia_ap_dung_vnd, trang_thai_xu_ly)
               values ('REQ-ZZZZZZZZ', 'ORD-ZZZZZZZZ', 'TB002', 'X', '0900000000',
                 '2026-10-27 20:00+07', '2026-10-28 08:00+07', 150000, 'DaXacNhan')""", fetch=False)


def test_rate_limit_on_public_lookup(client, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "public_rate_limit_per_minute", 3)
    body = {"ma_yeu_cau": "REQ-00000001", "so_dien_thoai": "0999999999"}
    codes = [client.post("/api/public/rental-requests/lookup", json=body).status_code for _ in range(4)]
    assert codes == [404, 404, 404, 429]
