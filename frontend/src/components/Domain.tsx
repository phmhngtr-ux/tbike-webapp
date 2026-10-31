// Thanh phan nghiep vu dung chung: anh xe, thanh ngu canh don, tien trinh, chi tiet phi tre.
import { useState, type ReactNode } from "react";
import { formatDateTime, formatDuration, formatVnd, vehicleImage } from "../lib/format";
import { DELIVERY, PROGRESS, REQUEST_STATUS, VEHICLE_TYPE } from "../lib/status";
import type { LateFeeBreakdown, RentalRequest, TrangThaiXuLy } from "../lib/types";
import { IconBike, IconTruck } from "./Icons";
import { Badge, cx } from "./ui";

export function VehiclePhoto({ tenXe, className }: { tenXe: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={cx("flex items-center justify-center text-[#8C9BAD]", className)} aria-label={`Ảnh ${tenXe} chưa có`}>
        <IconBike size={56} strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={vehicleImage(tenXe)} alt={tenXe} loading="lazy" onError={() => setFailed(true)} className={cx("object-contain", className)} />;
}

export function OrderContextBar({ order, right }: { order: RentalRequest; right?: ReactNode }) {
  const s = REQUEST_STATUS[order.trang_thai_xu_ly];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-panel border border-line bg-white px-5 py-5">
      <div>
        <p className="text-lg font-semibold text-ink">{order.ma_don_thue ?? order.ma_yeu_cau}</p>
        <p className="text-xs text-ink-muted">Yêu cầu {order.ma_yeu_cau}</p>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{order.ho_ten_khach}</p>
        <p className="text-[13px] text-ink-muted">{order.so_dien_thoai}</p>
      </div>
      <div className="min-w-[200px] flex-1">
        <p className="text-sm font-semibold text-ink">{order.ma_xe} • {order.ten_xe}</p>
        <p className="text-[13px] text-ink-muted">
          {VEHICLE_TYPE[order.loai_xe].split(" • ")[0]} • {formatVnd(order.don_gia_ap_dung_vnd ?? order.don_gia_hien_hanh_vnd)}/ngày
          {order.hinh_thuc_nhan_xe === "GiaoTanNoi" && <> • <IconTruck size={13} className="inline" /> Giao tận nơi</>}
        </p>
      </div>
      {right}
      <Badge tone={s.tone}>{s.label}</Badge>
    </div>
  );
}

export function ProgressSteps({ status, times }: { status: TrangThaiXuLy; times?: Partial<Record<TrangThaiXuLy, string | null>> }) {
  if (status === "TuChoi") return <Badge tone="danger">Đã từ chối</Badge>;
  const current = PROGRESS.indexOf(status);
  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {PROGRESS.map((st, i) => {
        const done = i < current || (status === "HoanTat" && i === current);
        const active = i === current && status !== "HoanTat";
        return (
          <li key={st} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                done || active ? "bg-primary text-white" : "border border-line bg-subtle text-ink-muted")}>{i + 1}</span>
              {i < PROGRESS.length - 1 && <span className={cx("h-0.5 flex-1", done ? "bg-primary" : "bg-line")} />}
            </div>
            <p className={cx("text-sm font-semibold", done || active ? "text-ink" : "text-ink-muted")}>{REQUEST_STATUS[st].label}</p>
            {times?.[st] && <p className="text-xs text-ink-muted">{formatDateTime(times[st]!)}</p>}
          </li>
        );
      })}
    </ol>
  );
}

const BRACKETS = [
  { ma: "BRULE-01", label: "Dưới 1 giờ", fee: (p: number) => 0 * p },
  { ma: "BRULE-02", label: "1–8 giờ", fee: (p: number) => p / 2, suffix: "½ ngày" },
  { ma: "BRULE-03", label: "Trên 8 giờ", fee: (p: number) => p, suffix: "1 ngày" },
];

/** Hien thi ket qua tinh phi DO BACKEND TRA VE - frontend khong tu quyet dinh phi. */
export function LateFeeCard({ fee }: { fee: LateFeeBreakdown }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <div className="flex justify-between py-1 text-[13px]"><span className="text-ink-muted">Trả dự kiến</span><b>{formatDateTime(fee.thoi_gian_tra_du_kien)}</b></div>
        <div className="flex justify-between py-1 text-[13px]"><span className="text-ink-muted">Trả thực tế</span><b>{formatDateTime(fee.thoi_gian_tra_thuc_te)}</b></div>
        <div className="flex justify-between py-1 text-[13px]"><span className="text-ink-muted">Thời gian trễ</span><b className={fee.phu_phi_vnd > 0 ? "text-warning" : "text-success"}>{formatDuration(fee.so_phut_tre)}</b></div>
        <div className="flex justify-between py-1 text-[13px]"><span className="text-ink-muted">Mức áp dụng</span><b>{fee.mo_ta_muc} ({fee.ma_quy_tac})</b></div>
      </div>
      <div>
        <p className="mb-2 text-xs text-ink-muted">Quy tắc tính phí trả trễ</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {BRACKETS.map((b) => {
            const on = b.ma === fee.ma_quy_tac;
            return (
              <div key={b.ma} className={cx("rounded-lg border p-3", on ? "border-warning/40 bg-warning-bg" : "border-line bg-subtle")}>
                <p className={cx("text-xs", on ? "font-semibold text-warning" : "text-ink-muted")}>{b.label}{on && " • áp dụng"}</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">{b.suffix ? `${b.suffix} = ` : ""}{formatVnd(b.fee(fee.don_gia_ngay_vnd))}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-end justify-between border-t border-line pt-4">
        <div>
          <p className="text-base font-semibold text-ink">Phụ phí trả trễ</p>
          <p className="text-xs text-ink-muted">{fee.he_so_ngay} × {formatVnd(fee.don_gia_ngay_vnd)} (đơn giá đã chốt)</p>
        </div>
        <p className={cx("text-[32px] font-bold", fee.phu_phi_vnd > 0 ? "text-warning" : "text-success")}>{fee.phu_phi_vnd > 0 ? formatVnd(fee.phu_phi_vnd) : "0đ"}</p>
      </div>
      {fee.phu_phi_vnd === 0 && <p className="text-[13px] font-semibold text-success">Không phát sinh phụ phí</p>}
    </div>
  );
}

export function DeliveryLine({ order }: { order: Pick<RentalRequest, "hinh_thuc_nhan_xe" | "dia_chi_giao_xe"> }) {
  return (
    <span>{DELIVERY[order.hinh_thuc_nhan_xe]}{order.dia_chi_giao_xe ? ` — ${order.dia_chi_giao_xe}` : ""}</span>
  );
}
