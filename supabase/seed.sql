-- T-BIKE | DATA GIA DINH cho local dev/test, KHONG PHAI du lieu xe/khach that.
-- Chi ap dung sau migration. Khong dung tren database dang van hanh.

insert into public.bang_gia_thue (loai_xe, don_gia_ngay_vnd) values
  ('Manual', 120000),
  ('Automatic', 150000);

insert into public.quy_tac_phi_tre
  (ma_quy_tac, tu_gio_tre, gom_moc_duoi, den_gio_tre, gom_moc_tren, he_so_ngay)
values
  ('BRULE-01', 0, true, 1, false, 0),
  ('BRULE-02', 1, true, 8, true, 0.50),
  ('BRULE-03', 8, false, null, false, 1.00);

insert into public.quy_tac_bao_duong (ma_quy_tac, nguong_km)
values ('BRULE-04', 2000);

insert into public.phuong_thuc_bao_dam (ma_phuong_thuc, ten_phuong_thuc) values
  ('CCCD_GOC', 'CCCD ban goc - bao dam thu cong'),
  ('TIEN_MAT', 'Dat coc bang tien mat - thu cong'),
  ('THOA_THUAN', 'Tien coc theo thoa thuan - thu cong');

insert into public.xe
  (ma_xe, ten_xe, loai_xe, trang_thai, odo_hien_tai, odo_bao_duong_gan_nhat)
values
  ('TB001', 'Honda Wave Alpha', 'Manual', 'KhaDung', 12500, 11000),
  ('TB002', 'Honda Vision', 'Automatic', 'DangThue', 8200, 7000),
  ('TB003', 'Yamaha Sirius', 'Manual', 'CanBaoDuong', 15200, 13100),
  ('TB004', 'Honda Air Blade', 'Automatic', 'KhaDung', 9990, 8000),
  ('TB005', 'Honda Wave RSX', 'Manual', 'CanBaoDuong', 6000, 4000);

insert into public.yeu_cau_thue
  (ma_yeu_cau, ma_don_thue, ma_xe, ho_ten_khach, so_dien_thoai,
   thoi_gian_nhan_du_kien, thoi_gian_tra_du_kien,
   thoi_diem_giao_xe, odo_giao_xe, don_gia_ap_dung_vnd, trang_thai_xu_ly,
   ma_phuong_thuc_bao_dam, trang_thai_bao_dam, ghi_chu_yeu_cau)
values
  ('REQ-00000001', null, 'TB001', 'Khach Mau A', '0900000001',
   '2026-10-28 08:00+07', '2026-10-29 08:00+07',
   null, null, null, 'DaGui', null, 'ChuaKiemTra', 'Yeu cau cho xu ly'),
  ('REQ-00000002', 'ORD-00000002', 'TB002', 'Khach Mau B', '0900000002',
   '2026-10-27 09:00+07', '2026-10-28 09:00+07',
   '2026-10-27 09:00+07', 8200, 150000, 'DangThue',
   'TIEN_MAT', 'DaXacNhan', 'Xe dang duoc thue'),
  ('REQ-00000003', null, 'TB002', 'Khach Mau C', '0900000003',
   '2026-10-27 12:00+07', '2026-10-28 10:00+07',
   null, null, null, 'DaGui', null, 'ChuaKiemTra', 'De kiem tra trung lich'),
  ('REQ-00000004', null, 'TB001', 'Khach Mau D', '0900000004',
   '2026-10-29 08:00+07', '2026-10-30 08:00+07',
   null, null, null, 'TuChoi', null, 'ChuaKiemTra', 'Yeu cau bi tu choi');

-- Khong seed tai_khoan_nhan_vien: moi ho so phai lien ket 1 auth.users(id) co that.
-- Khi tao user test tu Authentication > Users, copy UUID vao auth_user_id va tao ho so.
