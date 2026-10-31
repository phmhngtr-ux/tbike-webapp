// Kieu du lieu khop 1-1 voi backend/app/schemas.py (ten truong = ten cot DB)
export type LoaiXe = "Manual" | "Automatic";
export type TrangThaiXe = "KhaDung" | "DangThue" | "CanBaoDuong";
export type TrangThaiXuLy = "DaGui" | "DaXacNhan" | "DangThue" | "HoanTat" | "TuChoi";
export type TrangThaiBaoDam = "ChuaKiemTra" | "DaXacNhan" | "DaHoanTra";
export type VaiTro = "ChuCuaHang" | "NhanVien";
export type HinhThucNhanXe = "TaiCuaHang" | "GiaoTanNoi";

export interface Page<T> { items: T[]; total: number; page: number; page_size: number }

export interface StaffProfile { ma_nhan_vien: number; ten_dang_nhap: string; ho_ten: string; vai_tro: VaiTro; email: string | null }

export interface RentalPrice { loai_xe: LoaiXe; don_gia_ngay_vnd: number }
export interface DepositMethod { ma_phuong_thuc: string; ten_phuong_thuc: string; dang_ap_dung: boolean }

export interface Vehicle {
  ma_xe: string; ten_xe: string; loai_xe: LoaiXe; trang_thai: TrangThaiXe;
  odo_hien_tai: number; odo_bao_duong_gan_nhat: number; ngay_bao_duong_gan_nhat: string | null;
  nguong_km: number; km_tu_lan_bao_duong: number; can_bao_duong: boolean; don_gia_ngay_vnd: number;
}
export interface OdoEvent { thoi_diem: string; su_kien: "GiaoXe" | "NhanXe" | "BaoDuong"; ma_don_thue: string | null; odo: number; quang_duong: number | null; nguoi_ghi: string | null }
export interface ActiveOrderBrief { ma_yeu_cau: string; ma_don_thue: string | null; trang_thai_xu_ly: TrangThaiXuLy; ho_ten_khach: string; thoi_gian_nhan_du_kien: string; thoi_gian_tra_du_kien: string }
export interface VehicleDetail extends Vehicle { don_lien_quan: ActiveOrderBrief[]; lich_su_odo: OdoEvent[] }
export interface MaintenanceRecord { ma_lan_bao_duong: number; ma_xe: string; ngay_bao_duong: string; odo_luc_bao_duong: number; nguoi_ghi_nhan: number; ten_nguoi_ghi_nhan: string; ghi_chu: string | null; thoi_diem_ghi_nhan: string }
export interface MaintenanceCreated { ban_ghi: MaintenanceRecord; xe: Vehicle; moc_bao_duong_tiep_theo_km: number }

export interface RentalRequest {
  ma_yeu_cau: string; ma_don_thue: string | null; ma_xe: string; ten_xe: string; loai_xe: LoaiXe;
  ho_ten_khach: string; so_dien_thoai: string; ghi_chu_yeu_cau: string | null;
  hinh_thuc_nhan_xe: HinhThucNhanXe; dia_chi_giao_xe: string | null;
  thoi_gian_nhan_du_kien: string; thoi_gian_tra_du_kien: string;
  thoi_diem_giao_xe: string | null; thoi_gian_tra_thuc_te: string | null;
  odo_giao_xe: number | null; odo_nhan_xe: number | null; quang_duong_luot_thue: number | null;
  don_gia_ap_dung_vnd: number | null; don_gia_hien_hanh_vnd: number; so_ngay_thue: number; tien_thue_du_kien_vnd: number;
  ma_phuong_thuc_bao_dam: string | null; ten_phuong_thuc_bao_dam: string | null; trang_thai_bao_dam: TrangThaiBaoDam;
  so_gio_tre: number; ma_quy_tac_phi_tre: string | null; he_so_phi_tre_ap_dung: number; phu_phi_tre_han_vnd: number;
  trang_thai_xu_ly: TrangThaiXuLy; ly_do_tu_choi: string | null;
  nguoi_xac_nhan: number | null; ten_nguoi_xac_nhan: string | null; co_trung_lich: boolean;
  ngay_tao: string; ngay_cap_nhat: string;
}
export interface RentalRequestCreate {
  ma_xe: string; ho_ten_khach: string; so_dien_thoai: string;
  thoi_gian_nhan_du_kien: string; thoi_gian_tra_du_kien: string;
  ghi_chu_yeu_cau?: string | null; hinh_thuc_nhan_xe: HinhThucNhanXe; dia_chi_giao_xe?: string | null;
}
export interface RentalRequestCreated { ma_yeu_cau: string; trang_thai_xu_ly: TrangThaiXuLy; thong_bao: string }
export interface ConfirmResult { don: RentalRequest; canh_bao: string[] }
export interface LateFeeBreakdown {
  thoi_gian_tra_du_kien: string; thoi_gian_tra_thuc_te: string; so_phut_tre: number; so_gio_tre: number;
  ma_quy_tac: string; mo_ta_muc: string; he_so_ngay: number; don_gia_ngay_vnd: number; phu_phi_vnd: number;
}
export interface ReturnResult { don: RentalRequest; phi_tre: LateFeeBreakdown; can_bao_duong_sau_tra: boolean; km_tu_lan_bao_duong: number }
export interface CloseResult { don: RentalRequest; trang_thai_xe_moi: TrangThaiXe }

export interface PublicVehicle { ma_xe: string; ten_xe: string; loai_xe: LoaiXe; don_gia_ngay_vnd: number; kha_dung: boolean; ly_do: string | null }
export interface LookupResult {
  ma_yeu_cau: string; ma_don_thue: string | null; trang_thai_xu_ly: TrangThaiXuLy; ho_ten_khach: string;
  ten_xe: string; loai_xe: LoaiXe; thoi_gian_nhan_du_kien: string; thoi_gian_tra_du_kien: string;
  hinh_thuc_nhan_xe: HinhThucNhanXe; ly_do_tu_choi: string | null; ngay_tao: string;
}

export interface DashboardTask { loai: "GiaoXe" | "NhanXe"; thoi_diem: string; qua_han: boolean; ma_yeu_cau: string; ma_don_thue: string | null; ho_ten_khach: string; ma_xe: string; ten_xe: string; trang_thai_xu_ly: TrangThaiXuLy }
export interface DashboardLateOrder { ma_don_thue: string; ma_xe: string; ten_xe: string; loai_xe: LoaiXe; thoi_gian_tra_du_kien: string; thoi_gian_tra_thuc_te: string; so_gio_tre: number; he_so_phi_tre_ap_dung: number; phu_phi_tre_han_vnd: number }
export interface DashboardActivity { ma_yeu_cau: string; ma_don_thue: string | null; ho_ten_khach: string; ma_xe: string; trang_thai_xu_ly: TrangThaiXuLy; ngay_cap_nhat: string }
export interface DashboardSummary {
  tong_xe: number; xe_theo_trang_thai: Record<TrangThaiXe, number>; xe_can_bao_duong: number;
  yeu_cau_cho_xu_ly: number; yeu_cau_trung_lich: number; don_da_xac_nhan: number; don_dang_thue: number;
  don_qua_han_tra: number; don_cho_dong: number; viec_hom_nay: DashboardTask[]; xe_can_bao_duong_top: Vehicle[];
  don_tra_tre: DashboardLateOrder[]; hoat_dong_gan_day: DashboardActivity[]; cap_nhat_luc: string;
}
