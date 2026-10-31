import type { HinhThucNhanXe, LoaiXe, TrangThaiBaoDam, TrangThaiXe, TrangThaiXuLy } from "./types";

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";

export const VEHICLE_STATUS: Record<TrangThaiXe, { label: string; tone: Tone }> = {
  KhaDung: { label: "Khả dụng", tone: "success" },
  DangThue: { label: "Đang thuê", tone: "info" },
  CanBaoDuong: { label: "Cần bảo dưỡng", tone: "warning" },
};

export const REQUEST_STATUS: Record<TrangThaiXuLy, { label: string; tone: Tone }> = {
  DaGui: { label: "Đã gửi", tone: "info" },
  DaXacNhan: { label: "Đã xác nhận", tone: "success" },
  DangThue: { label: "Đang thuê", tone: "info" },
  HoanTat: { label: "Hoàn tất", tone: "success" },
  TuChoi: { label: "Từ chối", tone: "danger" },
};

export const DEPOSIT_STATUS: Record<TrangThaiBaoDam, { label: string; tone: Tone }> = {
  ChuaKiemTra: { label: "Chưa kiểm tra", tone: "neutral" },
  DaXacNhan: { label: "Đã xác nhận", tone: "success" },
  DaHoanTra: { label: "Đã hoàn trả", tone: "info" },
};

export const VEHICLE_TYPE: Record<LoaiXe, string> = { Manual: "Manual • Xe số", Automatic: "Automatic • Xe tay ga" };
export const DELIVERY: Record<HinhThucNhanXe, string> = { TaiCuaHang: "Nhận tại cửa hàng", GiaoTanNoi: "Giao tận nơi" };

/** Thu tu tien trinh hien thi cho khach / nhan vien */
export const PROGRESS: TrangThaiXuLy[] = ["DaGui", "DaXacNhan", "DangThue", "HoanTat"];
