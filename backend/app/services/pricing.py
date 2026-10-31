"""Bang gia thue va phuong thuc bao dam."""
from psycopg import Connection

from ..schemas import DepositMethod, RentalPrice


def list_prices(conn: Connection) -> list[RentalPrice]:
    with conn.cursor() as cur:
        cur.execute("select loai_xe::text as loai_xe, don_gia_ngay_vnd from public.bang_gia_thue order by don_gia_ngay_vnd")
        return [RentalPrice(**r) for r in cur.fetchall()]


def list_deposit_methods(conn: Connection, only_active: bool = True) -> list[DepositMethod]:
    with conn.cursor() as cur:
        cur.execute(
            "select ma_phuong_thuc, ten_phuong_thuc, dang_ap_dung from public.phuong_thuc_bao_dam"
            + (" where dang_ap_dung" if only_active else "") + " order by ma_phuong_thuc"
        )
        return [DepositMethod(**r) for r in cur.fetchall()]
