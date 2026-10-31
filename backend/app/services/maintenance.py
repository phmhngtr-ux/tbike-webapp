"""Bao duong: danh sach xe den han (BRULE-04), ghi nhan bao duong hoan tat, lich su."""
from psycopg import Connection

from .. import clock
from ..auth import CurrentStaff
from ..errors import conflict, invalid, not_found
from ..schemas import MaintenanceCreate, MaintenanceCreated, MaintenanceRecord, Vehicle
from .common import VEHICLE_SELECT, to_vehicle
from .vehicles import get_vehicle

HISTORY_SELECT = """
select l.ma_lan_bao_duong, l.ma_xe, l.ngay_bao_duong, l.odo_luc_bao_duong, l.nguoi_ghi_nhan,
       nv.ho_ten as ten_nguoi_ghi_nhan, l.ghi_chu, l.thoi_diem_ghi_nhan
from public.lich_su_bao_duong l
join public.tai_khoan_nhan_vien nv on nv.ma_nhan_vien = l.nguoi_ghi_nhan
"""


def list_due(conn: Connection) -> list[Vehicle]:
    with conn.cursor() as cur:
        cur.execute(
            "select t.* from (" + VEHICLE_SELECT + ") t where t.can_bao_duong order by t.km_tu_lan_bao_duong desc, t.ma_xe"
        )
        return [to_vehicle(r) for r in cur.fetchall()]


def history(conn: Connection, ma_xe: str) -> list[MaintenanceRecord]:
    get_vehicle(conn, ma_xe)
    with conn.cursor() as cur:
        cur.execute(HISTORY_SELECT + " where l.ma_xe = %s order by l.ngay_bao_duong desc, l.ma_lan_bao_duong desc", (ma_xe,))
        return [MaintenanceRecord(**r) for r in cur.fetchall()]


def record(conn: Connection, ma_xe: str, body: MaintenanceCreate, staff: CurrentStaff) -> MaintenanceCreated:
    with conn.cursor() as cur:
        cur.execute(
            """select x.ma_xe, x.trang_thai::text as trang_thai, x.odo_hien_tai, x.ngay_bao_duong_gan_nhat, q.nguong_km
               from public.xe x join public.quy_tac_bao_duong q on q.ma_quy_tac = x.ma_quy_tac_bao_duong
               where x.ma_xe = %s for update of x""",
            (ma_xe,),
        )
        xe = cur.fetchone()
    if xe is None:
        raise not_found(f"Không tìm thấy xe {ma_xe}")
    if xe["trang_thai"] == "DangThue":
        raise conflict("VEHICLE_IN_RENTAL", "Xe đang được thuê, chỉ ghi nhận bảo dưỡng sau khi nhận lại xe")
    if body.odo_luc_bao_duong < xe["odo_hien_tai"]:
        raise invalid(
            "ODO_LT_CURRENT",
            f"ODO bảo dưỡng không được nhỏ hơn ODO hiện tại ({xe['odo_hien_tai']} km)",
            {"odo_hien_tai": xe["odo_hien_tai"]},
        )
    today = clock.now().astimezone(clock.VN_TZ).date()
    if body.ngay_bao_duong > today:
        raise invalid("DATE_IN_FUTURE", "Ngày bảo dưỡng không được ở tương lai")
    if xe["ngay_bao_duong_gan_nhat"] and body.ngay_bao_duong < xe["ngay_bao_duong_gan_nhat"]:
        raise invalid("DATE_BEFORE_LAST", "Ngày bảo dưỡng không được trước lần bảo dưỡng gần nhất")
    with conn.cursor() as cur:
        cur.execute(
            """insert into public.lich_su_bao_duong (ma_xe, ngay_bao_duong, odo_luc_bao_duong, nguoi_ghi_nhan, ghi_chu)
               values (%s, %s, %s, %s, %s) returning ma_lan_bao_duong""",
            (ma_xe, body.ngay_bao_duong, body.odo_luc_bao_duong, staff.ma_nhan_vien, body.ghi_chu),
        )
        new_id = cur.fetchone()["ma_lan_bao_duong"]
        cur.execute(
            """update public.xe
               set odo_hien_tai = %(odo)s, odo_bao_duong_gan_nhat = %(odo)s,
                   ngay_bao_duong_gan_nhat = %(ngay)s, trang_thai = 'KhaDung'
               where ma_xe = %(m)s""",
            {"odo": body.odo_luc_bao_duong, "ngay": body.ngay_bao_duong, "m": ma_xe},
        )
        cur.execute(HISTORY_SELECT + " where l.ma_lan_bao_duong = %s", (new_id,))
        rec = MaintenanceRecord(**cur.fetchone())
        cur.execute(VEHICLE_SELECT + " where x.ma_xe = %s", (ma_xe,))
        vehicle = to_vehicle(cur.fetchone())
    return MaintenanceCreated(ban_ghi=rec, xe=vehicle, moc_bao_duong_tiep_theo_km=body.odo_luc_bao_duong + xe["nguong_km"])
