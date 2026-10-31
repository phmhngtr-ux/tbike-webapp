import { api } from "../lib/api";
import type { LoaiXe, LookupResult, PublicVehicle, RentalPrice, RentalRequestCreate, RentalRequestCreated } from "../lib/types";

export const publicApi = {
  pricing: () => api<RentalPrice[]>("/api/rental-pricing", { auth: false }),
  vehicles: (q: { tu?: string; den?: string; loai_xe?: LoaiXe | "" }) =>
    api<PublicVehicle[]>("/api/public/vehicles", { auth: false, query: q }),
  createRequest: (body: RentalRequestCreate) =>
    api<RentalRequestCreated>("/api/rental-requests", { auth: false, method: "POST", body }),
  lookup: (body: { ma_yeu_cau: string; so_dien_thoai: string }) =>
    api<LookupResult>("/api/public/rental-requests/lookup", { auth: false, method: "POST", body }),
};
