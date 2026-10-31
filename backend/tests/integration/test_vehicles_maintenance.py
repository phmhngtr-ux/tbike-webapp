from datetime import date, datetime

from .conftest import VN, auth


def test_due_list_uses_threshold_rule(client):
    due = client.get("/api/maintenance/due", headers=auth()).json()
    assert [v["ma_xe"] for v in due] == ["TB003", "TB005"]       # 2100, 2000 (dung nguong)
    assert all(v["can_bao_duong"] for v in due)
    tb4 = client.get("/api/vehicles/TB004", headers=auth()).json()
    assert tb4["km_tu_lan_bao_duong"] == 1990 and tb4["can_bao_duong"] is False  # duoi nguong


def test_record_maintenance(client, now, sql):
    r = client.post("/api/vehicles/TB005/maintenance-records", json={"ngay_bao_duong": "2026-10-27", "odo_luc_bao_duong": 5999}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "ODO_LT_CURRENT"
    r = client.post("/api/vehicles/TB005/maintenance-records", json={"ngay_bao_duong": "2026-10-28", "odo_luc_bao_duong": 6000}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "DATE_IN_FUTURE"
    r = client.post("/api/vehicles/TB005/maintenance-records",
                    json={"ngay_bao_duong": "2026-10-27", "odo_luc_bao_duong": 6000, "ghi_chu": " Thay nhot,  kiem tra phanh "}, headers=auth())
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["xe"]["trang_thai"] == "KhaDung" and body["xe"]["odo_bao_duong_gan_nhat"] == 6000
    assert body["moc_bao_duong_tiep_theo_km"] == 8000
    assert body["ban_ghi"]["ten_nguoi_ghi_nhan"] == "Le Trang" and body["ban_ghi"]["ghi_chu"] == "Thay nhot, kiem tra phanh"
    hist = client.get("/api/vehicles/TB005/maintenance-history", headers=auth()).json()
    assert len(hist) == 1 and hist[0]["odo_luc_bao_duong"] == 6000
    assert [v["ma_xe"] for v in client.get("/api/maintenance/due", headers=auth()).json()] == ["TB003"]
    detail = client.get("/api/vehicles/TB005", headers=auth()).json()
    assert detail["lich_su_odo"][0]["su_kien"] == "BaoDuong"
    assert sql("select ngay_bao_duong_gan_nhat from public.xe where ma_xe='TB005'") == [(date(2026, 10, 27),)]


def test_maintenance_blocked_while_rented(client):
    r = client.post("/api/vehicles/TB002/maintenance-records", json={"ngay_bao_duong": "2026-10-27", "odo_luc_bao_duong": 8200}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "VEHICLE_IN_RENTAL"


def test_vehicle_list_filters_and_not_found(client):
    r = client.get("/api/vehicles", params={"loai_xe": "Manual"}, headers=auth()).json()
    assert [v["ma_xe"] for v in r["items"]] == ["TB001", "TB003", "TB005"] and r["total"] == 3
    r = client.get("/api/vehicles", params={"trang_thai": "CanBaoDuong", "sort": "gan_moc_bao_duong"}, headers=auth()).json()
    assert [v["ma_xe"] for v in r["items"]] == ["TB003", "TB005"]
    r = client.get("/api/vehicles", params={"q": "vision"}, headers=auth()).json()
    assert [v["ma_xe"] for v in r["items"]] == ["TB002"]
    r = client.get("/api/vehicles", params={"page": 2, "page_size": 2}, headers=auth()).json()
    assert r["total"] == 5 and [v["ma_xe"] for v in r["items"]] == ["TB003", "TB004"]
    assert client.get("/api/vehicles/XX999", headers=auth()).status_code == 404
    assert client.get("/api/vehicles", params={"loai_xe": "Scooter"}, headers=auth()).status_code == 422


def test_pricing_and_deposit_methods(client):
    assert client.get("/api/rental-pricing").json() == [
        {"loai_xe": "Manual", "don_gia_ngay_vnd": 120000}, {"loai_xe": "Automatic", "don_gia_ngay_vnd": 150000}]
    assert {m["ma_phuong_thuc"] for m in client.get("/api/deposit-methods", headers=auth()).json()} == {"CCCD_GOC", "TIEN_MAT", "THOA_THUAN"}


def test_dashboard_numbers_come_from_db(client):
    s = client.get("/api/dashboard/summary", headers=auth()).json()
    assert s["tong_xe"] == 5
    assert s["xe_theo_trang_thai"] == {"KhaDung": 2, "DangThue": 1, "CanBaoDuong": 2}
    assert s["yeu_cau_cho_xu_ly"] == 2 and s["yeu_cau_trung_lich"] == 1
    assert s["don_dang_thue"] == 1 and s["don_qua_han_tra"] == 0
    assert [t["ma_don_thue"] for t in s["viec_hom_nay"]] == []  # ORD-2 tra 28/10, hom nay la 27/10
    assert len(s["hoat_dong_gan_day"]) == 4


def test_authorization_with_real_profiles(client):
    assert client.get("/api/staff", headers=auth("token-owner")).status_code == 200
    assert client.get("/api/staff", headers=auth("token-nv")).status_code == 403
    assert client.get("/api/me", headers=auth("token-inactive")).json()["error"]["code"] == "STAFF_INACTIVE"
    assert client.get("/api/me", headers=auth("token-noprofile")).json()["error"]["code"] == "STAFF_PROFILE_NOT_FOUND"
    assert client.get("/api/me", headers=auth("bad")).status_code == 401
