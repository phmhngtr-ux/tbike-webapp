"""Tong quan van hanh - moi so lieu doc truc tiep tu DB."""
from datetime import datetime, time, timedelta

from psycopg import Connection

from .. import clock
from ..schemas import DashboardActivity, DashboardLateOrder, DashboardSummary, DashboardTask
from .maintenance import list_due
from .vehicles import count_by_status


def summary(conn: Connection) -> DashboardSummary:
    now = clock.now()
    today = now.astimezone(clock.VN_TZ).date()
    end_of_day = datetime.combine(today + timedelta(days=1), time.min, tzinfo=clock.VN_TZ)
    start_of_day = datetime.combine(today, time.min, tzinfo=clock.VN_TZ)
    by_status = count_by_status(conn)
    due = list_due(conn)
    with conn.cursor() as cur:
        cur.execute(
            """select
                 count(*) filter (where trang_thai_xu_ly = 'DaGui') as cho_xu_ly,
                 count(*) filter (where trang_thai_xu_ly = 'DaXacNhan') as da_xac_nhan,
                 count(*) filter (where trang_thai_xu_ly = 'DangThue') as dang_thue,
                 count(*) filter (where trang_thai_xu_ly = 'DangThue' and thoi_gian_tra_thuc_te is null
                                  and thoi_gian_tra_du_kien < %(now)s) as qua_han,
                 count(*) filter (where trang_thai_xu_ly = 'DangThue' and thoi_gian_tra_thuc_te is not null) as cho_dong,
                 count(*) filter (where trang_thai_xu_ly = 'DaGui' and exists (
                     select 1 from public.yeu_cau_thue o where o.ma_xe = y.ma_xe and o.ma_yeu_cau <> y.ma_yeu_cau
                       and o.trang_thai_xu_ly in ('DaXacNhan','DangThue')
                       and o.thoi_gian_nhan_du_kien < y.thoi_gian_tra_du_kien
                       and o.thoi_gian_tra_du_kien > y.thoi_gian_nhan_du_kien)) as trung_lich
               from public.yeu_cau_thue y""",
            {"now": now},
        )
        c = cur.fetchone()
        cur.execute(
            """select * from (
                 select 'GiaoXe' as loai, y.thoi_gian_nhan_du_kien as thoi_diem,
                        (y.thoi_gian_nhan_du_kien < %(now)s) as qua_han,
                        y.ma_yeu_cau, y.ma_don_thue, y.ho_ten_khach, y.ma_xe, x.ten_xe, y.trang_thai_xu_ly::text as trang_thai_xu_ly
                 from public.yeu_cau_thue y join public.xe x on x.ma_xe = y.ma_xe
                 where y.trang_thai_xu_ly = 'DaXacNhan' and y.thoi_gian_nhan_du_kien < %(eod)s
                 union all
                 select 'NhanXe', y.thoi_gian_tra_du_kien, (y.thoi_gian_tra_du_kien < %(now)s),
                        y.ma_yeu_cau, y.ma_don_thue, y.ho_ten_khach, y.ma_xe, x.ten_xe, y.trang_thai_xu_ly::text
                 from public.yeu_cau_thue y join public.xe x on x.ma_xe = y.ma_xe
                 where y.trang_thai_xu_ly = 'DangThue' and y.thoi_gian_tra_thuc_te is null
                   and y.thoi_gian_tra_du_kien < %(eod)s
               ) t
               where t.qua_han or t.thoi_diem >= %(sod)s
               order by t.qua_han desc, t.thoi_diem asc limit 20""",
            {"now": now, "eod": end_of_day, "sod": start_of_day},
        )
        tasks = [DashboardTask(**r) for r in cur.fetchall()]
        cur.execute(
            """select y.ma_don_thue, y.ma_xe, x.ten_xe, x.loai_xe::text as loai_xe, y.thoi_gian_tra_du_kien,
                      y.thoi_gian_tra_thuc_te, y.so_gio_tre::float as so_gio_tre,
                      y.he_so_phi_tre_ap_dung::float as he_so_phi_tre_ap_dung, y.phu_phi_tre_han_vnd
               from public.yeu_cau_thue y join public.xe x on x.ma_xe = y.ma_xe
               where y.trang_thai_xu_ly = 'DangThue' and y.thoi_gian_tra_thuc_te is not null and y.phu_phi_tre_han_vnd > 0
               order by y.thoi_gian_tra_thuc_te asc limit 10"""
        )
        late = [DashboardLateOrder(**r) for r in cur.fetchall()]
        cur.execute(
            """select ma_yeu_cau, ma_don_thue, ho_ten_khach, ma_xe, trang_thai_xu_ly::text as trang_thai_xu_ly, ngay_cap_nhat
               from public.yeu_cau_thue order by ngay_cap_nhat desc limit 8"""
        )
        activity = [DashboardActivity(**r) for r in cur.fetchall()]
    return DashboardSummary(
        tong_xe=sum(by_status.values()),
        xe_theo_trang_thai=by_status,
        xe_can_bao_duong=len(due),
        yeu_cau_cho_xu_ly=c["cho_xu_ly"],
        yeu_cau_trung_lich=c["trung_lich"],
        don_da_xac_nhan=c["da_xac_nhan"],
        don_dang_thue=c["dang_thue"],
        don_qua_han_tra=c["qua_han"],
        don_cho_dong=c["cho_dong"],
        viec_hom_nay=tasks,
        xe_can_bao_duong_top=due[:5],
        don_tra_tre=late,
        hoat_dong_gan_day=activity,
        cap_nhat_luc=now,
    )
