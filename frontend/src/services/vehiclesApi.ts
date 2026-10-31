import { api } from "../lib/api";
import type { LoaiXe, MaintenanceCreated, MaintenanceRecord, Page, TrangThaiXe, Vehicle, VehicleDetail } from "../lib/types";

export interface VehicleQuery {
  q?: string; loai_xe?: LoaiXe | ""; trang_thai?: TrangThaiXe | ""; sort?: "ma_xe" | "gan_moc_bao_duong" | "odo";
  page?: number; page_size?: number;
}

export const vehiclesApi = {
  list: (q: VehicleQuery) => api<Page<Vehicle>>("/api/vehicles", { query: { ...q } }),
  detail: (maXe: string) => api<VehicleDetail>(`/api/vehicles/${encodeURIComponent(maXe)}`),
  history: (maXe: string) => api<MaintenanceRecord[]>(`/api/vehicles/${encodeURIComponent(maXe)}/maintenance-history`),
  due: () => api<Vehicle[]>("/api/maintenance/due"),
  recordMaintenance: (maXe: string, body: { ngay_bao_duong: string; odo_luc_bao_duong: number; ghi_chu?: string | null }) =>
    api<MaintenanceCreated>(`/api/vehicles/${encodeURIComponent(maXe)}/maintenance-records`, { method: "POST", body }),
};
