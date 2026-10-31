insert into public.tai_khoan_nhan_vien (auth_user_id, ten_dang_nhap, ho_ten, vai_tro)
values (
  'DÁN-MÃ-UUID-VỪA-COPY-VÀO-ĐÂY', 
  'admin', 
  'Quản trị viên T-Bike', 
  'ChuCuaHang'
)
returning ma_nhan_vien, ten_dang_nhap, vai_tro;