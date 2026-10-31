-- T-BIKE | Doc/kiem tra KHONG phat sinh ghi du lieu (chay bang SQL Editor hoac psql).

-- A. Dem ban ghi cua 8 bang
select 'bang_gia_thue' as bang, count(*) as so_dong from public.bang_gia_thue
union all select 'quy_tac_phi_tre', count(*) from public.quy_tac_phi_tre
union all select 'quy_tac_bao_duong', count(*) from public.quy_tac_bao_duong
union all select 'phuong_thuc_bao_dam', count(*) from public.phuong_thuc_bao_dam
union all select 'tai_khoan_nhan_vien', count(*) from public.tai_khoan_nhan_vien
union all select 'xe', count(*) from public.xe
union all select 'lich_su_bao_duong', count(*) from public.lich_su_bao_duong
union all select 'yeu_cau_thue', count(*) from public.yeu_cau_thue;

-- B. Xe cham / qua nguong bao duong theo BRULE-04
select x.ma_xe, x.trang_thai,
       x.odo_hien_tai - x.odo_bao_duong_gan_nhat as km_tu_lan_bao_duong,
       q.nguong_km,
       (x.odo_hien_tai - x.odo_bao_duong_gan_nhat >= q.nguong_km) as can_canh_bao
from public.xe x
join public.quy_tac_bao_duong q on q.ma_quy_tac = x.ma_quy_tac_bao_duong
order by x.ma_xe;

-- C. Kiem tra lich thue TB002 xung dot voi 12:00 27/10 -> 10:00 28/10
-- Dung khoang [bat dau, ket thuc) de hai don sat nhau khong bi nham la trung.
select ma_yeu_cau, ma_don_thue, ma_xe, trang_thai_xu_ly
from public.yeu_cau_thue
where ma_xe = 'TB002'
  and trang_thai_xu_ly in ('DaXacNhan', 'DangThue')
  and thoi_gian_nhan_du_kien < timestamptz '2026-10-28 10:00+07'
  and thoi_gian_tra_du_kien > timestamptz '2026-10-27 12:00+07';

-- D. Kiem tra moc 1h va 8h - don gia demo 120000 VND
with cases as (
  select '30 phut' as tinh_huong, interval '30 minutes' as thoi_gian_tre union all
  select 'dung 1 gio', interval '1 hour' union all
  select 'dung 8 gio', interval '8 hours' union all
  select '8 gio 1 phut', interval '8 hours 1 minute'
)
select tinh_huong,
       case
         when thoi_gian_tre < interval '1 hour' then 0
         when thoi_gian_tre <= interval '8 hours' then 60000
         else 120000
       end as phi_du_kien_vnd
from cases;

-- E. Kiem tra du lieu canh bao nhung trang thai xe khong trung khop (phuc vu review)
select x.ma_xe, x.trang_thai,
       (x.odo_hien_tai - x.odo_bao_duong_gan_nhat) as km_tich_luy
from public.xe x
join public.quy_tac_bao_duong q on q.ma_quy_tac = x.ma_quy_tac_bao_duong
where x.odo_hien_tai - x.odo_bao_duong_gan_nhat >= q.nguong_km
  and x.trang_thai <> 'CanBaoDuong';

-- Test tu choi nen chay tung cau INSERT co du lieu sai trong DB dev, tranh
-- chay hang loat len production. DB CHECK chi phong ve 1 phan; backend con phai
-- kiem tra so ODO vua nhap, trung lich va quyen chinh sua don HoanTat.
