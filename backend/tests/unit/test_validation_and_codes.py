from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from app.domain.codes import ORDER_CODE_RE, REQUEST_CODE_RE, make_request_code, order_code_for
from app.domain.validation import mask_name, normalize_phone
from app.schemas import ConfirmRequest, HandoverRequest, MaintenanceCreate, RentalRequestCreate, ReturnRequest

VN = timezone(timedelta(hours=7))
BASE = dict(ma_xe="TB001", ho_ten_khach="Nguyen Minh Anh", so_dien_thoai="0901234567",
            thoi_gian_nhan_du_kien=datetime(2030, 1, 1, 8, tzinfo=VN), thoi_gian_tra_du_kien=datetime(2030, 1, 2, 8, tzinfo=VN))


def test_codes_fit_varchar12_and_are_random():
    codes = {make_request_code() for _ in range(200)}
    assert len(codes) == 200
    for c in codes:
        assert len(c) == 12 and REQUEST_CODE_RE.match(c)
        o = order_code_for(c)
        assert len(o) == 12 and ORDER_CODE_RE.match(o) and o[4:] == c[4:]


def test_order_code_rejects_bad_input():
    with pytest.raises(ValueError):
        order_code_for("REQ-1")


@pytest.mark.parametrize("raw, ok", [
    ("0901234567", "0901234567"), ("090 123 4567", "0901234567"), ("+84901234567", "0901234567"), ("09012345678", "09012345678"),
])
def test_phone_ok(raw, ok):
    assert normalize_phone(raw) == ok


@pytest.mark.parametrize("raw", ["12345", "1901234567", "090123456789", "abc"])
def test_phone_bad(raw):
    with pytest.raises(ValueError):
        normalize_phone(raw)


def test_mask_name():
    assert mask_name("Nguyen Minh Anh") == "N*** M*** Anh"


def test_request_valid():
    r = RentalRequestCreate(**BASE)
    assert r.hinh_thuc_nhan_xe == "TaiCuaHang" and r.dia_chi_giao_xe is None


def test_request_return_not_after_pickup():
    with pytest.raises(ValidationError):
        RentalRequestCreate(**{**BASE, "thoi_gian_tra_du_kien": BASE["thoi_gian_nhan_du_kien"]})


def test_request_naive_datetime_rejected():
    with pytest.raises(ValidationError):
        RentalRequestCreate(**{**BASE, "thoi_gian_nhan_du_kien": datetime(2030, 1, 1, 8)})


def test_request_delivery_needs_address():
    with pytest.raises(ValidationError):
        RentalRequestCreate(**{**BASE, "hinh_thuc_nhan_xe": "GiaoTanNoi"})
    ok = RentalRequestCreate(**{**BASE, "hinh_thuc_nhan_xe": "GiaoTanNoi", "dia_chi_giao_xe": " 45 Vo Nguyen Giap "})
    assert ok.dia_chi_giao_xe == "45 Vo Nguyen Giap"


def test_request_missing_name():
    with pytest.raises(ValidationError):
        RentalRequestCreate(**{**BASE, "ho_ten_khach": "   "})


@pytest.mark.parametrize("model, field", [(HandoverRequest, "odo_giao_xe"), (ReturnRequest, "odo_nhan_xe"), (MaintenanceCreate, "odo_luc_bao_duong")])
@pytest.mark.parametrize("value", [-1, 1_000_000])
def test_odo_bounds(model, field, value):
    extra = {"ngay_bao_duong": "2026-10-20"} if model is MaintenanceCreate else {}
    with pytest.raises(ValidationError):
        model(**{field: value, **extra})


def test_confirm_deposit_needs_method():
    with pytest.raises(ValidationError):
        ConfirmRequest(trang_thai_bao_dam="DaXacNhan")
