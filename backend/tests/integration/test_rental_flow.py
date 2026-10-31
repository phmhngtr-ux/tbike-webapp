"""Quy trinh day du: Tao yeu cau -> Xac nhan -> Dat coc -> Ban giao -> Nhan xe -> Tinh phi -> Dong don."""
from datetime import datetime

import psycopg
import pytest

from .conftest import TEST_DB, VN, auth


def iso(*a):
    return datetime(*a, tzinfo=VN).isoformat()


def test_full_rental_flow(client, now, sql):
    # 0. Khach xem xe trong khoang 28/10 09:00 -> 29/10 09:00
    r = client.get("/api/public/vehicles", params={"tu": iso(2026, 10, 28, 9), "den": iso(2026, 10, 29, 9)})
    assert r.status_code == 200
    by = {v["ma_xe"]: v for v in r.json()}
    assert by["TB004"]["kha_dung"] is True
    assert by["TB003"]["kha_dung"] is False                 # CanBaoDuong
    assert by["TB002"]["kha_dung"] is True                  # don ORD-2 ket thuc dung 09:00 -> khong trung [)

    # 1. Tao yeu cau (giao tan noi - CR-01)
    r = client.post("/api/rental-requests", json={
        "ma_xe": "TB004", "ho_ten_khach": "Nguyen Minh Anh", "so_dien_thoai": "0901 234 567",
        "thoi_gian_nhan_du_kien": iso(2026, 10, 28, 9), "thoi_gian_tra_du_kien": iso(2026, 10, 29, 9),
        "hinh_thuc_nhan_xe": "GiaoTanNoi", "dia_chi_giao_xe": "45 Vo Nguyen Giap, Ngu Hanh Son",
    })
    assert r.status_code == 201, r.text
    code = r.json()["ma_yeu_cau"]
    assert r.json()["trang_thai_xu_ly"] == "DaGui"

    lst = client.get("/api/rental-requests", params={"trang_thai": "DaGui", "q": "Minh Anh"}, headers=auth())
    assert [x["ma_yeu_cau"] for x in lst.json()["items"]] == [code]
    assert lst.json()["items"][0]["so_dien_thoai"] == "0901234567"

    # 2. Xac nhan -> chot gia
    r = client.post(f"/api/rental-requests/{code}/confirm", json={}, headers=auth())
    assert r.status_code == 200, r.text
    order = r.json()["don"]
    ord_code = order["ma_don_thue"]
    assert ord_code == "ORD-" + code[4:]
    assert order["trang_thai_xu_ly"] == "DaXacNhan" and order["don_gia_ap_dung_vnd"] == 150000
    assert order["ten_nguoi_xac_nhan"] == "Le Trang" and order["tien_thue_du_kien_vnd"] == 150000

    assert client.post(f"/api/rental-requests/{code}/confirm", json={}, headers=auth()).json()["error"]["code"] == "INVALID_STATE"

    # 3. Doi bang gia -> don da xac nhan KHONG doi gia
    sql("update public.bang_gia_thue set don_gia_ngay_vnd = 200000 where loai_xe = 'Automatic'", fetch=False)
    o = client.get(f"/api/rental-orders/{ord_code}", headers=auth()).json()
    assert o["don_gia_ap_dung_vnd"] == 150000 and o["don_gia_hien_hanh_vnd"] == 200000

    # 4. Ban giao khi chua xac nhan dat coc -> bi chan
    r = client.post(f"/api/rental-orders/{ord_code}/handover", json={"odo_giao_xe": 9990}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "DEPOSIT_NOT_CONFIRMED"

    # 5. Dat coc
    r = client.patch(f"/api/rental-orders/{ord_code}/deposit",
                     json={"ma_phuong_thuc_bao_dam": "KHONG_TON_TAI", "trang_thai_bao_dam": "DaXacNhan"}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "DEPOSIT_METHOD_INVALID"
    r = client.patch(f"/api/rental-orders/{ord_code}/deposit",
                     json={"ma_phuong_thuc_bao_dam": "TIEN_MAT", "trang_thai_bao_dam": "DaHoanTra"}, headers=auth())
    assert r.status_code == 422  # DaHoanTra chi dat khi dong don
    r = client.patch(f"/api/rental-orders/{ord_code}/deposit",
                     json={"ma_phuong_thuc_bao_dam": "TIEN_MAT", "trang_thai_bao_dam": "DaXacNhan"}, headers=auth())
    assert r.status_code == 200 and r.json()["trang_thai_bao_dam"] == "DaXacNhan"

    # 6. Ban giao
    now.set(datetime(2026, 10, 28, 9, 5, tzinfo=VN))
    r = client.post(f"/api/rental-orders/{ord_code}/handover", json={"odo_giao_xe": 9980}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "ODO_LT_CURRENT"
    r = client.post(f"/api/rental-orders/{ord_code}/handover",
                    json={"odo_giao_xe": 9993, "thoi_diem_giao_xe": iso(2026, 10, 28, 9, 30)}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "TIME_IN_FUTURE"
    r = client.post(f"/api/rental-orders/{ord_code}/handover", json={"odo_giao_xe": 9993}, headers=auth())
    assert r.status_code == 200, r.text
    assert r.json()["trang_thai_xu_ly"] == "DangThue" and r.json()["odo_giao_xe"] == 9993
    assert sql("select trang_thai::text, odo_hien_tai from public.xe where ma_xe='TB004'") == [("DangThue", 9993)]
    r = client.post(f"/api/rental-orders/{ord_code}/handover", json={"odo_giao_xe": 9993}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "ALREADY_HANDED_OVER"

    # 7. Xem truoc phi tre tai moc bien (tra du kien 29/10 09:00)
    def preview(h, m):
        return client.post(f"/api/rental-orders/{ord_code}/late-fee-preview",
                           json={"thoi_gian_tra_thuc_te": iso(2026, 10, 29, h, m)}, headers=auth()).json()
    assert preview(9, 59)["phu_phi_vnd"] == 0
    assert preview(10, 0)["phu_phi_vnd"] == 75000
    assert preview(17, 0)["phu_phi_vnd"] == 75000
    assert preview(17, 1)["phu_phi_vnd"] == 150000

    # 8. Nhan xe
    now.set(datetime(2026, 10, 29, 17, 30, tzinfo=VN))
    r = client.post(f"/api/rental-orders/{ord_code}/return", json={"odo_nhan_xe": 9900}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "ODO_LT_HANDOVER"
    r = client.post(f"/api/rental-orders/{ord_code}/return",
                    json={"odo_nhan_xe": 10050, "thoi_gian_tra_thuc_te": iso(2026, 10, 29, 17, 0)}, headers=auth())
    assert r.status_code == 200, r.text
    res = r.json()
    assert res["phi_tre"]["phu_phi_vnd"] == 75000 and res["phi_tre"]["ma_quy_tac"] == "BRULE-02"
    assert res["don"]["quang_duong_luot_thue"] == 57 and res["don"]["so_gio_tre"] == 8.0
    assert res["can_bao_duong_sau_tra"] is True and res["km_tu_lan_bao_duong"] == 2050
    r = client.post(f"/api/rental-orders/{ord_code}/return", json={"odo_nhan_xe": 10050}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "ALREADY_RETURNED"

    # 9. Dong don
    r = client.post(f"/api/rental-orders/{ord_code}/close", json={"da_thu_phu_phi": False, "da_hoan_tra_bao_dam": True}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "FEE_NOT_COLLECTED"
    r = client.post(f"/api/rental-orders/{ord_code}/close", json={"da_thu_phu_phi": True, "da_hoan_tra_bao_dam": False}, headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "DEPOSIT_NOT_RETURNED"
    r = client.post(f"/api/rental-orders/{ord_code}/close", json={"da_thu_phu_phi": True, "da_hoan_tra_bao_dam": True}, headers=auth())
    assert r.status_code == 200, r.text
    assert r.json()["don"]["trang_thai_xu_ly"] == "HoanTat"
    assert r.json()["don"]["trang_thai_bao_dam"] == "DaHoanTra"
    assert r.json()["trang_thai_xe_moi"] == "CanBaoDuong"   # 10050 - 8000 = 2050 >= 2000 -> khong tu ve KhaDung

    # 10. Thao tac lap / sua trai phep sau HoanTat
    r = client.post(f"/api/rental-orders/{ord_code}/close", json={"da_thu_phu_phi": True, "da_hoan_tra_bao_dam": True}, headers=auth())
    assert r.status_code == 409 and r.json()["error"]["code"] == "ALREADY_CLOSED"
    r = client.patch(f"/api/rental-orders/{ord_code}/deposit",
                     json={"ma_phuong_thuc_bao_dam": "TIEN_MAT", "trang_thai_bao_dam": "ChuaKiemTra"}, headers=auth())
    assert r.status_code == 409
    with pytest.raises(psycopg.DatabaseError) as exc:
        sql("update public.yeu_cau_thue set phu_phi_tre_han_vnd = 0 where ma_don_thue = %s", (ord_code,), fetch=False)
    assert exc.value.sqlstate == "TB001"

    # 11. Dashboard & tra cuu khach
    s = client.get("/api/dashboard/summary", headers=auth()).json()
    assert s["xe_theo_trang_thai"]["CanBaoDuong"] == 3 and s["xe_can_bao_duong"] == 3
    assert s["tong_xe"] == 5
    r = client.post("/api/public/rental-requests/lookup", json={"ma_yeu_cau": code.lower(), "so_dien_thoai": "0901234567"})
    assert r.status_code == 200 and r.json()["trang_thai_xu_ly"] == "HoanTat"
    assert r.json()["ho_ten_khach"] == "N*** M*** Anh" and "so_dien_thoai" not in r.json()
    r = client.post("/api/public/rental-requests/lookup", json={"ma_yeu_cau": code, "so_dien_thoai": "0900000009"})
    assert r.status_code == 404


def test_on_time_return_has_no_fee_and_vehicle_available(client, now, sql):
    # TB002 dang thue (ORD-00000002, tra du kien 28/10 09:00, ODO giao 8200, moc BD 7000)
    now.set(datetime(2026, 10, 28, 10, 0, tzinfo=VN))
    r = client.post("/api/rental-orders/ORD-00000002/return",
                    json={"odo_nhan_xe": 8300, "thoi_gian_tra_thuc_te": iso(2026, 10, 28, 9, 59)}, headers=auth())
    assert r.status_code == 200, r.text
    assert r.json()["phi_tre"]["phu_phi_vnd"] == 0 and r.json()["phi_tre"]["mo_ta_muc"] == "Dưới 1 giờ"
    # Khong co phu phi -> khong bat buoc tick da thu phi
    r = client.post("/api/rental-orders/ORD-00000002/close", json={"da_thu_phu_phi": False, "da_hoan_tra_bao_dam": True}, headers=auth())
    assert r.status_code == 200 and r.json()["trang_thai_xe_moi"] == "KhaDung"
