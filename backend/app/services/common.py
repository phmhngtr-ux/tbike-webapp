"""SQL dung chung va ham chuyen dong DB -> model API."""
import math
from decimal import Decimal

from ..schemas import RentalRequest, Vehicle

VEHICLE_SELECT = """
select x.ma_xe, x.ten_xe, x.loai_xe::text as loai_xe, x.trang_thai::text as trang_thai,
       x.odo_hien_tai, x.odo_bao_duong_gan_nhat, x.ngay_bao_duong_gan_nhat,
       q.nguong_km,
       (x.odo_hien_tai - x.odo_bao_duong_gan_nhat) as km_tu_lan_bao_duong,
       (x.odo_hien_tai - x.odo_bao_duong_gan_nhat) >= q.nguong_km as can_bao_duong,
       g.don_gia_ngay_vnd
from public.xe x
join public.quy_tac_bao_duong q on q.ma_quy_tac = x.ma_quy_tac_bao_duong
join public.bang_gia_thue g on g.loai_xe = x.loai_xe
"""

# Dieu kien giao nhau cua khoang [nhan, tra) - hai don sat nhau (tra = nhan) KHONG tinh la trung.
OVERLAP_SQL = """
select o.ma_yeu_cau, o.ma_don_thue, o.thoi_gian_nhan_du_kien, o.thoi_gian_tra_du_kien
from public.yeu_cau_thue o
where o.ma_xe = %(ma_xe)s
  and o.trang_thai_xu_ly in ('DaXacNhan', 'DangThue')
  and o.thoi_gian_nhan_du_kien < %(den)s
  and o.thoi_gian_tra_du_kien > %(tu)s
  and (%(exclude)s::varchar is null or o.ma_yeu_cau <> %(exclude)s::varchar)
"""

REQUEST_SELECT = """
select y.ma_yeu_cau, y.ma_don_thue, y.ma_xe, x.ten_xe, x.loai_xe::text as loai_xe,
       y.ho_ten_khach, y.so_dien_thoai, y.ghi_chu_yeu_cau,
       y.hinh_thuc_nhan_xe::text as hinh_thuc_nhan_xe, y.dia_chi_giao_xe,
       y.thoi_gian_nhan_du_kien, y.thoi_gian_tra_du_kien, y.thoi_diem_giao_xe, y.thoi_gian_tra_thuc_te,
       y.odo_giao_xe, y.odo_nhan_xe, y.quang_duong_luot_thue,
       y.don_gia_ap_dung_vnd, g.don_gia_ngay_vnd as don_gia_hien_hanh_vnd,
       y.ma_phuong_thuc_bao_dam, p.ten_phuong_thuc as ten_phuong_thuc_bao_dam,
       y.trang_thai_bao_dam::text as trang_thai_bao_dam,
       y.so_gio_tre, y.ma_quy_tac_phi_tre, y.he_so_phi_tre_ap_dung, y.phu_phi_tre_han_vnd,
       y.trang_thai_xu_ly::text as trang_thai_xu_ly, y.ly_do_tu_choi,
       y.nguoi_xac_nhan, nv.ho_ten as ten_nguoi_xac_nhan,
       y.ngay_tao, y.ngay_cap_nhat,
       (y.trang_thai_xu_ly = 'DaGui' and exists (
          select 1 from public.yeu_cau_thue o
          where o.ma_xe = y.ma_xe and o.ma_yeu_cau <> y.ma_yeu_cau
            and o.trang_thai_xu_ly in ('DaXacNhan', 'DangThue')
            and o.thoi_gian_nhan_du_kien < y.thoi_gian_tra_du_kien
            and o.thoi_gian_tra_du_kien > y.thoi_gian_nhan_du_kien)) as co_trung_lich
from public.yeu_cau_thue y
join public.xe x on x.ma_xe = y.ma_xe
join public.bang_gia_thue g on g.loai_xe = x.loai_xe
left join public.phuong_thuc_bao_dam p on p.ma_phuong_thuc = y.ma_phuong_thuc_bao_dam
left join public.tai_khoan_nhan_vien nv on nv.ma_nhan_vien = y.nguoi_xac_nhan
"""


def rental_days(nhan, tra) -> int:
    """So ngay tinh tien: lam tron len theo 24 gio, toi thieu 1 ngay."""
    hours = (tra - nhan).total_seconds() / 3600
    return max(1, math.ceil(hours / 24 - 1e-9))


def to_vehicle(row: dict) -> Vehicle:
    return Vehicle(**{k: row[k] for k in Vehicle.model_fields})


def to_request(row: dict) -> RentalRequest:
    data = dict(row)
    for k in ("so_gio_tre", "he_so_phi_tre_ap_dung"):
        v = data.get(k)
        data[k] = float(v) if isinstance(v, Decimal) else (v or 0.0)
    days = rental_days(data["thoi_gian_nhan_du_kien"], data["thoi_gian_tra_du_kien"])
    price = data["don_gia_ap_dung_vnd"] or data["don_gia_hien_hanh_vnd"]
    data["so_ngay_thue"] = days
    data["tien_thue_du_kien_vnd"] = days * price
    return RentalRequest(**{k: data[k] for k in RentalRequest.model_fields})
