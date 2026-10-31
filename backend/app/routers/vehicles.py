from typing import Literal

from fastapi import APIRouter, Depends, Path, Query
from psycopg import Connection

from ..auth import CurrentStaff, any_staff
from ..db import get_db
from ..schemas import LoaiXe, MaintenanceCreate, MaintenanceCreated, MaintenanceRecord, Page, TrangThaiXe, Vehicle, VehicleDetail
from ..services import maintenance as maint
from ..services import vehicles as svc

router = APIRouter(prefix="/api", tags=["Xe & bảo dưỡng"])
MaXe = Path(min_length=1, max_length=10)


@router.get("/vehicles", response_model=Page[Vehicle])
def list_vehicles(
    q: str | None = Query(default=None, max_length=50),
    loai_xe: LoaiXe | None = None,
    trang_thai: TrangThaiXe | None = None,
    can_bao_duong: bool | None = None,
    sort: Literal["ma_xe", "gan_moc_bao_duong", "odo"] = "ma_xe",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: CurrentStaff = Depends(any_staff),
    conn: Connection = Depends(get_db),
):
    return svc.list_vehicles(conn, q, loai_xe, trang_thai, can_bao_duong, sort, page, page_size)


@router.get("/vehicles/{ma_xe}", response_model=VehicleDetail)
def vehicle_detail(ma_xe: str = MaXe, _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return svc.get_vehicle_detail(conn, ma_xe)


@router.get("/vehicles/{ma_xe}/maintenance-history", response_model=list[MaintenanceRecord])
def maintenance_history(ma_xe: str = MaXe, _: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return maint.history(conn, ma_xe)


@router.post("/vehicles/{ma_xe}/maintenance-records", response_model=MaintenanceCreated, status_code=201)
def record_maintenance(
    body: MaintenanceCreate,
    ma_xe: str = MaXe,
    staff: CurrentStaff = Depends(any_staff),
    conn: Connection = Depends(get_db),
):
    return maint.record(conn, ma_xe, body, staff)


@router.get("/maintenance/due", response_model=list[Vehicle])
def maintenance_due(_: CurrentStaff = Depends(any_staff), conn: Connection = Depends(get_db)):
    return maint.list_due(conn)
