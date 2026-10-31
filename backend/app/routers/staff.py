from fastapi import APIRouter, Depends
from psycopg import Connection

from ..auth import CurrentStaff, any_staff, owner_only
from ..db import get_db
from ..schemas import StaffAccount, StaffProfile
from ..services import staff as svc

router = APIRouter(prefix="/api", tags=["Nhân viên"])


@router.get("/me", response_model=StaffProfile, summary="Hồ sơ nhân viên đang đăng nhập")
def me(staff: CurrentStaff = Depends(any_staff)):
    return StaffProfile(ma_nhan_vien=staff.ma_nhan_vien, ten_dang_nhap=staff.ten_dang_nhap,
                        ho_ten=staff.ho_ten, vai_tro=staff.vai_tro, email=staff.email)


@router.get("/staff", response_model=list[StaffAccount], summary="Danh sách nhân viên (Chủ cửa hàng)")
def list_staff(_: CurrentStaff = Depends(owner_only), conn: Connection = Depends(get_db)):
    return svc.list_staff(conn)
