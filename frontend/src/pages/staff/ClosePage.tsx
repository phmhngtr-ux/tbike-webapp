import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { LateFeeCard, OrderContextBar } from "../../components/Domain";
import { IconCheck } from "../../components/Icons";
import { Alert, Badge, Button, DetailRow, EmptyState, ErrorState, LoadingState, Modal, PageHeading, Panel } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime, formatKm, formatVnd } from "../../lib/format";
import { VEHICLE_STATUS } from "../../lib/status";
import type { CloseResult } from "../../lib/types";
import { invalidateOperational, qk } from "../../services/queryKeys";
import { rentalsApi } from "../../services/rentalsApi";
import { vehiclesApi } from "../../services/vehiclesApi";
import { useOrder } from "./useOrder";

/** D3 + D4 · Chi tiet phi tre & hoan tat tra xe */
export function ClosePage() {
  const { maDon = "" } = useParams();
  const client = useQueryClient();
  const order = useOrder(maDon);
  const o = order.data;
  const returned = !!o?.thoi_gian_tra_thuc_te;
  // Chi tiet phi lay tu backend theo thoi gian tra DA LUU (khong tinh o frontend)
  const fee = useQuery({ queryKey: ["late-fee-saved", maDon, o?.thoi_gian_tra_thuc_te], queryFn: () => rentalsApi.previewLateFee(maDon, o!.thoi_gian_tra_thuc_te!), enabled: returned });
  const vehicle = useQuery({ queryKey: [...qk.vehicles, "detail", o?.ma_xe], queryFn: () => vehiclesApi.detail(o!.ma_xe), enabled: !!o });
  const [feeCollected, setFeeCollected] = useState(false);
  const [depositReturned, setDepositReturned] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CloseResult | null>(null);

  const close = useMutation({
    mutationFn: () => rentalsApi.close(maDon, { da_thu_phu_phi: feeCollected, da_hoan_tra_bao_dam: depositReturned }),
    onSuccess: async (r) => { setResult(r); setOpen(false); await invalidateOperational(client); },
  });
  const apiErr = close.error instanceof ApiError ? close.error : null;
  const v = vehicle.data;
  const willNeedMaintenance = v ? v.km_tu_lan_bao_duong >= v.nguong_km : false;
  const total = o ? o.tien_thue_du_kien_vnd + o.phu_phi_tre_han_vnd : 0;
  const needFee = (o?.phu_phi_tre_han_vnd ?? 0) > 0;
  const needDeposit = o?.trang_thai_bao_dam === "DaXacNhan";
  const ready = returned && o?.trang_thai_xu_ly === "DangThue" && (!needFee || feeCollected) && (!needDeposit || depositReturned);

  return (
    <StaffLayout breadcrumb={["Yêu cầu & đơn thuê", "Hoàn tất trả xe"]}>
      {order.isLoading && <LoadingState />}
      {order.notFound && <EmptyState title={`Không tìm thấy đơn ${maDon}`} />}
      {order.isError && !order.notFound && <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />}
      {o && (
        <>
          <PageHeading eyebrow={`Đơn thuê / ${maDon}`} title="Hoàn tất trả xe" subtitle="Rà soát tiền thuê, bảo đảm và trạng thái xe trước khi chốt đơn." />
          <OrderContextBar order={result?.don ?? o} />
          {result && (
            <Alert tone={result.trang_thai_xe_moi === "CanBaoDuong" ? "warning" : "success"} title={`Đã đóng đơn ${maDon}`} action={<Link to="/nhan-vien/yeu-cau" className="text-sm font-semibold text-primary underline">Về danh sách</Link>}>
              Tiền thuê {formatVnd(result.don.tien_thue_du_kien_vnd)} • Phụ phí {formatVnd(result.don.phu_phi_tre_han_vnd)} • Bảo đảm đã hoàn trả. Xe {result.don.ma_xe} chuyển sang {VEHICLE_STATUS[result.trang_thai_xe_moi].label}
              {result.trang_thai_xe_moi === "CanBaoDuong" && ", tạm khóa cho thuê"}.
            </Alert>
          )}
          {!returned && <Alert tone="warning" title="Chưa thể hoàn tất trả xe" action={<Link to={`/nhan-vien/don/${maDon}/nhan-xe`} className="text-sm font-semibold text-primary underline">Tới bước nhận xe</Link>}>Thiếu ODO nhận xe và thời gian trả thực tế.</Alert>}
          {o.trang_thai_xu_ly === "HoanTat" && !result && <Alert tone="info" title="Đơn đã hoàn tất trước đó">Dữ liệu đã khóa, không chỉnh sửa được.</Alert>}
          {returned && (
            <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
              <div className="space-y-6">
                <Panel title="Đối chiếu thời gian & ODO">
                  <div className="grid gap-x-10 sm:grid-cols-2">
                    <div><DetailRow label="Nhận xe">{formatDateTime(o.thoi_diem_giao_xe)}</DetailRow><DetailRow label="Trả dự kiến">{formatDateTime(o.thoi_gian_tra_du_kien)}</DetailRow><DetailRow label="Trả thực tế">{formatDateTime(o.thoi_gian_tra_thuc_te)}</DetailRow></div>
                    <div><DetailRow label="ODO giao">{formatKm(o.odo_giao_xe)}</DetailRow><DetailRow label="ODO nhận">{formatKm(o.odo_nhan_xe)}</DetailRow><DetailRow label="Quãng đường">{formatKm(o.quang_duong_luot_thue)}</DetailRow></div>
                  </div>
                </Panel>
                <Panel title="Chi tiết tiền thuê" caption={`Đơn giá ${formatVnd(o.don_gia_ap_dung_vnd)}/ngày (đã chốt khi xác nhận) • không có thuế hoặc phụ phí khác.`}>
                  <DetailRow label={`Tiền thuê cơ bản • ${o.so_ngay_thue} × ${formatVnd(o.don_gia_ap_dung_vnd)}`}>{formatVnd(o.tien_thue_du_kien_vnd)}</DetailRow>
                  <div className="mt-4">
                    {fee.isLoading && <LoadingState rows={2} label="Đang tải chi tiết phí…" />}
                    {fee.isError && <ErrorState message={errorMessage(fee.error)} onRetry={() => fee.refetch()} />}
                    {fee.data && <LateFeeCard fee={fee.data} />}
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                    <div><p className="text-base font-semibold">Tổng tiền thuê cần thu</p><p className="text-xs text-ink-muted">{formatVnd(o.tien_thue_du_kien_vnd)} + {formatVnd(o.phu_phi_tre_han_vnd)} = {formatVnd(total)}</p></div>
                    <p className="text-[32px] font-bold text-primary">{formatVnd(total)}</p>
                  </div>
                </Panel>
                <Panel title="Hoàn trả bảo đảm">
                  <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">{o.ten_phuong_thuc_bao_dam ?? "Không có bảo đảm"}</p><p className="text-xs text-ink-muted">Hoàn riêng toàn bộ cho khách</p></div>
                    <Badge tone={o.trang_thai_bao_dam === "DaHoanTra" ? "info" : "warning"}>{o.trang_thai_bao_dam === "DaHoanTra" ? "Đã hoàn trả" : "Chờ hoàn trả"}</Badge></div>
                  <div className="mt-4"><Alert tone="info" title="Không tự khấu trừ tiền thuê vào bảo đảm">Thu tiền thuê {formatVnd(total)} và hoàn riêng bảo đảm cho khách khi xác nhận hoàn tất.</Alert></div>
                  {o.trang_thai_xu_ly === "DangThue" && !result && (
                    <div className="mt-4 space-y-3">
                      {needFee && <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={feeCollected} onChange={(e) => setFeeCollected(e.target.checked)} />Đã thu tổng {formatVnd(total)} (gồm phụ phí trễ {formatVnd(o.phu_phi_tre_han_vnd)})</label>}
                      {needDeposit && <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={depositReturned} onChange={(e) => setDepositReturned(e.target.checked)} />Đã hoàn trả {o.ten_phuong_thuc_bao_dam} cho khách</label>}
                    </div>
                  )}
                </Panel>
              </div>
              <aside className="space-y-6">
                <Panel title="Trạng thái xe sau trả">
                  {vehicle.isLoading && <LoadingState rows={2} />}
                  {v && (<>
                    <Badge tone={willNeedMaintenance ? "warning" : "success"}>{willNeedMaintenance ? "Cần bảo dưỡng" : "Khả dụng"}</Badge>
                    <div className="mt-3"><DetailRow label="ODO bảo dưỡng gần nhất">{formatKm(v.odo_bao_duong_gan_nhat)}</DetailRow><DetailRow label="Từ lần bảo dưỡng gần nhất" tone={willNeedMaintenance ? "warning" : undefined}>{formatKm(v.km_tu_lan_bao_duong)}</DetailRow></div>
                    <p className={`mt-2 text-xs ${willNeedMaintenance ? "text-warning" : "text-ink-muted"}`}>{willNeedMaintenance ? `${formatKm(v.odo_hien_tai)} − ${formatKm(v.odo_bao_duong_gan_nhat)} ≥ ${formatKm(v.nguong_km)}. ${v.ma_xe} chuyển Cần bảo dưỡng, không chuyển Khả dụng.` : `Dưới ngưỡng ${formatKm(v.nguong_km)} — xe sẵn sàng cho thuê lại.`}</p>
                  </>)}
                </Panel>
                {apiErr && <Alert tone="danger" title={apiErr.code === "ALREADY_CLOSED" ? "Đơn đã hoàn tất trước đó" : "Chưa thể hoàn tất"}>{apiErr.message}</Alert>}
                {o.trang_thai_xu_ly === "DangThue" && !result && (
                  <div className="flex flex-col gap-3">
                    <Button icon={<IconCheck size={16} />} disabled={!ready} onClick={() => setOpen(true)}>Xác nhận hoàn tất trả xe</Button>
                    <Link to={`/nhan-vien/don/${maDon}`} className="text-center text-[13px] font-semibold text-primary">Quay lại đơn</Link>
                    {!ready && <p className="text-xs text-ink-muted">Đánh dấu đã thu tiền và đã hoàn trả bảo đảm để tiếp tục.</p>}
                  </div>
                )}
              </aside>
            </div>
          )}
          <Modal open={open} title="Xác nhận hoàn tất trả xe?" onClose={() => setOpen(false)}
            footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button loading={close.isPending} onClick={() => close.mutate()}>Hoàn tất trả xe</Button></>}>
            <p>Chốt {maDon} với tổng tiền {formatVnd(total)} và xác nhận đã hoàn đủ bảo đảm cho khách. Sau khi hoàn tất, ODO, thời gian và phí sẽ bị khóa.</p>
            {v && <p className={`mt-3 text-[13px] ${willNeedMaintenance ? "text-warning" : "text-success"}`}>{v.ma_xe} → {willNeedMaintenance ? "Cần bảo dưỡng" : "Khả dụng"}</p>}
          </Modal>
        </>
      )}
    </StaffLayout>
  );
}
