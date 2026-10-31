from datetime import datetime

from fastapi import APIRouter, Depends, Path, Query
from pydantic import AwareDatetime
from psycopg import Connection

from ..auth import CurrentStaff, any_staff
from ..db import get_db
from ..rate_limit import rate_limit
from ..schemas import (
    CloseRequest, CloseResult, ConfirmRequest, ConfirmResult, DepositMethod, DepositUpdate, HandoverRequest,
    LateFeeBreakdown, LateFeePreviewRequest, Page, RejectRequest, RentalPrice, RentalRequest, RentalRequestCreate,
    RentalRequestCreated, ReturnRequest, ReturnResult, TrangThaiXuLy,
)
from ..services import pricing
from ..services import rentals as svc

router = APIRouter(prefix="/api", tags=["Yêu cầu & đơn thuê"])
MaYeuCau = Path(min_length=4, max_length=12)
MaDon = Path(min_length=4, max_length=12)


@router.get("/rental-pricing", response_model=list[RentalPrice], summary="Bảng giá (công khai)")
def rental_pricing(conn: Connection = Depends(get_db)):
    return pricing.list_prices(conn)


@router.get("/deposit-methods", response_model=list[DepositMethod])
def deposit_methods(_: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return pricing.list_deposit_methods(conn)


@router.post("/rental-requests", response_model=RentalRequestCreated, status_code=201,
             summary="Khách gửi yêu cầu thuê (không cần tài khoản)",
             dependencies=[Depends(rate_limit("create_request"))])
def create_rental_request(body: RentalRequestCreate, conn: Connection = Depends(get_db)):
    return svc.create_request(conn, body)


@router.get("/rental-requests", response_model=Page[RentalRequest])
def list_rental_requests(
    trang_thai: list[TrangThaiXuLy] | None = Query(default=None),
    q: str | None = Query(default=None, max_length=50),
    tu: AwareDatetime | None = None,
    den: AwareDatetime | None = None,
    ma_xe: str | None = Query(default=None, max_length=10),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: CurrentStaff = Depends(any_staff),
    conn: Connection = Depends(get_db),
):
    return svc.list_requests(conn, trang_thai, q, tu, den, ma_xe, page, page_size)


@router.get("/rental-requests/{ma_yeu_cau}", response_model=RentalRequest)
def get_rental_request(ma_yeu_cau: str = MaYeuCau, _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.get_request(conn, ma_yeu_cau)


@router.post("/rental-requests/{ma_yeu_cau}/confirm", response_model=ConfirmResult)
def confirm_rental_request(body: ConfirmRequest, ma_yeu_cau: str = MaYeuCau,
                           staff: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.confirm(conn, ma_yeu_cau, body, staff)


@router.post("/rental-requests/{ma_yeu_cau}/reject", response_model=RentalRequest)
def reject_rental_request(body: RejectRequest, ma_yeu_cau: str = MaYeuCau,
                          staff: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.reject(conn, ma_yeu_cau, body, staff)


@router.get("/rental-orders/{ma_don_thue}", response_model=RentalRequest)
def get_rental_order(ma_don_thue: str = MaDon, _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.get_order(conn, ma_don_thue)


@router.patch("/rental-orders/{ma_don_thue}/deposit", response_model=RentalRequest)
def update_deposit(body: DepositUpdate, ma_don_thue: str = MaDon,
                   _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.update_deposit(conn, ma_don_thue, body)


@router.post("/rental-orders/{ma_don_thue}/handover", response_model=RentalRequest)
def handover(body: HandoverRequest, ma_don_thue: str = MaDon,
             _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.handover(conn, ma_don_thue, body)


@router.post("/rental-orders/{ma_don_thue}/late-fee-preview", response_model=LateFeeBreakdown,
             summary="Tính thử phí trễ (không lưu)")
def late_fee_preview(body: LateFeePreviewRequest, ma_don_thue: str = MaDon,
                     _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.preview_late_fee(conn, ma_don_thue, body.thoi_gian_tra_thuc_te)


@router.post("/rental-orders/{ma_don_thue}/return", response_model=ReturnResult)
def return_vehicle(body: ReturnRequest, ma_don_thue: str = MaDon,
                   _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.return_vehicle(conn, ma_don_thue, body)


@router.post("/rental-orders/{ma_don_thue}/close", response_model=CloseResult)
def close_order(body: CloseRequest, ma_don_thue: str = MaDon,
                _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.close(conn, ma_don_thue, body)
