"""Danh sach / chi tiet xe va lich su ODO."""
from psycopg import Connection

from ..errors import not_found
from ..schemas import ActiveOrderBrief, OdoEvent, Page, Vehicle, VehicleDetail
from .common import VEHICLE_SELECT, to_vehicle

SORTS = {
    "ma_xe": "t.ma_xe asc",
    "gan_moc_bao_duong": "t.km_tu_lan_bao_duong desc, t.ma_xe asc",
    "odo": "t.odo_hien_tai desc, t.ma_xe asc",
}


def list_vehicles(
    conn: Connection,
    q: str | None,
    loai_xe: str | None,
    trang_thai: str | None,
    can_bao_duong: bool | None,
    sort: str,
    page: int,
    page_size: int,
) -> Page[Vehicle]:
    where, params = ["true"], {}
    if q:
        where.append("(t.ma_xe ilike %(q)s or t.ten_xe ilike %(q)s)")
        params["q"] = f"%{q.strip()}%"
    if loai_xe:
        where.append("t.loai_xe = %(loai)s")
        params["loai"] = loai_xe
    if trang_thai:
        where.append("t.trang_thai = %(tt)s")
        params["tt"] = trang_thai
    if can_bao_duong is not None:
        where.append("t.can_bao_duong = %(cbd)s")
        params["cbd"] = can_bao_duong
    params.update(limit=page_size, offset=(page - 1) * page_size)
    sql = (
        "select t.*, count(*) over() as _total from (" + VEHICLE_SELECT + ") t where " + " and ".join(where)
        + f" order by {SORTS.get(sort, SORTS['ma_xe'])} limit %(limit)s offset %(offset)s"
    )
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        if rows:
            total = rows[0]["_total"]
        else:
            cur.execute("select count(*) as n from (" + VEHICLE_SELECT + ") t where " + " and ".join(where), params)
            total = cur.fetchone()["n"]
    return Page[Vehicle](items=[to_vehicle(r) for r in rows], total=total, page=page, page_size=page_size)


def count_by_status(conn: Connection) -> dict[str, int]:
    out = {"KhaDung": 0, "DangThue": 0, "CanBaoDuong": 0}
    with conn.cursor() as cur:
        cur.execute("select trang_thai::text as tt, count(*) as n from public.xe group by 1")
        for r in cur.fetchall():
            out[r["tt"]] = r["n"]
    return out


def get_vehicle(conn: Connection, ma_xe: str) -> Vehicle:
    with conn.cursor() as cur:
        cur.execute(VEHICLE_SELECT + " where x.ma_xe = %s", (ma_xe,))
        row = cur.fetchone()
    if row is None:
        raise not_found(f"Không tìm thấy xe {ma_xe}")
    return to_vehicle(row)


def get_vehicle_detail(conn: Connection, ma_xe: str) -> VehicleDetail:
    vehicle = get_vehicle(conn, ma_xe)
    with conn.cursor() as cur:
        cur.execute(
            """select ma_yeu_cau, ma_don_thue, trang_thai_xu_ly::text as trang_thai_xu_ly, ho_ten_khach,
                      thoi_gian_nhan_du_kien, thoi_gian_tra_du_kien
               from public.yeu_cau_thue
               where ma_xe = %s and trang_thai_xu_ly in ('DaGui', 'DaXacNhan', 'DangThue')
               order by thoi_gian_nhan_du_kien asc limit 20""",
            (ma_xe,),
        )
        orders = [ActiveOrderBrief(**r) for r in cur.fetchall()]
        cur.execute(
            """select * from (
                 select y.thoi_diem_giao_xe as thoi_diem, 'GiaoXe' as su_kien, y.ma_don_thue,
                        y.odo_giao_xe as odo, null::integer as quang_duong, null::text as nguoi_ghi
                 from public.yeu_cau_thue y where y.ma_xe = %(m)s and y.thoi_diem_giao_xe is not null
                 union all
                 select y.thoi_gian_tra_thuc_te, 'NhanXe', y.ma_don_thue, y.odo_nhan_xe, y.quang_duong_luot_thue, null
                 from public.yeu_cau_thue y where y.ma_xe = %(m)s and y.thoi_gian_tra_thuc_te is not null
                 union all
                 select l.thoi_diem_ghi_nhan, 'BaoDuong', null, l.odo_luc_bao_duong, null, nv.ho_ten
                 from public.lich_su_bao_duong l
                 join public.tai_khoan_nhan_vien nv on nv.ma_nhan_vien = l.nguoi_ghi_nhan
                 where l.ma_xe = %(m)s
               ) e order by thoi_diem desc limit 30""",
            {"m": ma_xe},
        )
        events = [OdoEvent(**r) for r in cur.fetchall()]
    return VehicleDetail(**vehicle.model_dump(), don_lien_quan=orders, lich_su_odo=events)
