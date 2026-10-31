"""Danh sach tai khoan nhan vien (chi Chu cua hang)."""
from psycopg import Connection

from ..schemas import StaffAccount


def list_staff(conn: Connection) -> list[StaffAccount]:
    with conn.cursor() as cur:
        cur.execute(
            """select ma_nhan_vien, ten_dang_nhap, ho_ten, vai_tro::text as vai_tro, dang_hoat_dong, ngay_tao
               from public.tai_khoan_nhan_vien order by ma_nhan_vien"""
        )
        return [StaffAccount(**r) for r in cur.fetchall()]
