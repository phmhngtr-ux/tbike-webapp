"""Chuc nang cong khai cho khach (khong can tai khoan)."""
from datetime import datetime

from psycopg import Connection

from ..domain.validation import mask_name
from ..errors import invalid, not_found
from ..schemas import LookupRequest, LookupResult, PublicVehicle


def list_vehicles(conn: Connection, tu: datetime | None, den: datetime | None, loai_xe: str | None) -> list[PublicVehicle]:
    if (tu is None) != (den is None):
        raise invalid("RANGE_INCOMPLETE", "Cần chọn cả thời gian nhận và trả xe")
    if tu and den and den <= tu:
        raise invalid("RANGE_INVALID", "Thời gian trả phải sau thời gian nhận xe")
    params = {"tu": tu, "den": den, "loai": loai_xe}
    sql = """
      select x.ma_xe, x.ten_xe, x.loai_xe::text as loai_xe, g.don_gia_ngay_vnd, x.trang_thai::text as trang_thai,
             case when %(tu)s::timestamptz is null then false else exists (
               select 1 from public.yeu_cau_thue o
               where o.ma_xe = x.ma_xe and o.trang_thai_xu_ly in ('DaXacNhan','DangThue')
                 and o.thoi_gian_nhan_du_kien < %(den)s::timestamptz and o.thoi_gian_tra_du_kien > %(tu)s::timestamptz
             ) end as trung_lich
      from public.xe x join public.bang_gia_thue g on g.loai_xe = x.loai_xe
      where (%(loai)s::text is null or x.loai_xe::text = %(loai)s::text)
      order by x.loai_xe, x.ten_xe, x.ma_xe"""
    out = []
    with conn.cursor() as cur:
        cur.execute(sql, params)
        for r in cur.fetchall():
            if r["trang_thai"] == "CanBaoDuong":
                ok, reason = False, "Tạm ngừng cho thuê để bảo dưỡng"
            elif tu is None:
                ok = r["trang_thai"] == "KhaDung"
                reason = None if ok else "Đang có khách thuê — chọn thời gian để kiểm tra lịch trống"
            elif r["trung_lich"]:
                ok, reason = False, "Đã có lịch thuê trùng thời gian bạn chọn"
            else:
                ok, reason = True, None
            out.append(PublicVehicle(ma_xe=r["ma_xe"], ten_xe=r["ten_xe"], loai_xe=r["loai_xe"],
                                     don_gia_ngay_vnd=r["don_gia_ngay_vnd"], kha_dung=ok, ly_do=reason))
    return out


def lookup(conn: Connection, body: LookupRequest) -> LookupResult:
    """Can khop CA ma yeu cau va so dien thoai. Sai bat ky dieu kien nao -> cung 1 thong bao 404."""
    with conn.cursor() as cur:
        cur.execute(
            """select y.ma_yeu_cau, y.ma_don_thue, y.trang_thai_xu_ly::text as trang_thai_xu_ly, y.ho_ten_khach,
                      x.ten_xe, x.loai_xe::text as loai_xe, y.thoi_gian_nhan_du_kien, y.thoi_gian_tra_du_kien,
                      y.hinh_thuc_nhan_xe::text as hinh_thuc_nhan_xe, y.ly_do_tu_choi, y.ngay_tao
               from public.yeu_cau_thue y join public.xe x on x.ma_xe = y.ma_xe
               where y.ma_yeu_cau = %s and y.so_dien_thoai = %s""",
            (body.ma_yeu_cau, body.so_dien_thoai),
        )
        row = cur.fetchone()
    if row is None:
        raise not_found("Không tìm thấy yêu cầu khớp với mã và số điện thoại đã nhập")
    row["ho_ten_khach"] = mask_name(row["ho_ten_khach"])
    return LookupResult(**row)
