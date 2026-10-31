import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { DeliveryLine, ProgressSteps } from "../../components/Domain";
import { Alert, Badge, Button, cx, DetailRow, EmptyState, ErrorState, inputClass, LoadingState, PageHeading, Panel } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { formatDateTime, formatKm, formatVnd } from "../../lib/format";
import { DEPOSIT_STATUS, REQUEST_STATUS } from "../../lib/status";
import { invalidateOperational, qk } from "../../services/queryKeys";
import { rentalsApi } from "../../services/rentalsApi";
import { useOrder } from "./useOrder";

/** C4 · Chi tiet don thue & dat coc */
export function OrderDetailPage() {
  const { maDon = "" } = useParams();
  const client = useQueryClient();
  const order = useOrder(maDon);
  const methods = useQuery({ queryKey: qk.depositMethods, queryFn: rentalsApi.depositMethods });
  const o = order.data;
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState<"ChuaKiemTra" | "DaXacNhan">("ChuaKiemTra");
  useEffect(() => {
    if (!o) return;
    setMethod(o.ma_phuong_thuc_bao_dam ?? "");
    setStatus(o.trang_thai_bao_dam === "DaXacNhan" ? "DaXacNhan" : "ChuaKiemTra");
  }, [o?.ma_phuong_thuc_bao_dam, o?.trang_thai_bao_dam]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => rentalsApi.updateDeposit(maDon, { ma_phuong_thuc_bao_dam: method, trang_thai_bao_dam: status }),
    onSuccess: () => invalidateOperational(client),
  });

  const next = o && (
    o.trang_thai_xu_ly === "DaXacNhan" ? { to: `/nhan-vien/don/${maDon}/giao-xe`, label: "Giao xe" }
      : o.trang_thai_xu_ly === "DangThue" && !o.thoi_gian_tra_thuc_te ? { to: `/nhan-vien/don/${maDon}/nhan-xe`, label: "Nhận xe" }
        : o.trang_thai_xu_ly === "DangThue" ? { to: `/nhan-vien/don/${maDon}/hoan-tat`, label: "Hoàn tất trả xe" } : null);

  return (
    <StaffLayout breadcrumb={["Yêu cầu & đơn thuê", maDon]}>
      {order.isLoading && <LoadingState />}
      {order.notFound && <EmptyState title={`Không tìm thấy đơn ${maDon}`} action={<Link to="/nhan-vien/yeu-cau" className="font-semibold text-primary underline">Về danh sách</Link>} />}
      {order.isError && !order.notFound && <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />}
      {o && (
        <>
          <PageHeading eyebrow={`Đơn thuê / ${maDon}`} title="Chi tiết đơn thuê" subtitle="Theo dõi trạng thái, bảo đảm, ODO và phụ phí của đơn."
            actions={<Badge tone={REQUEST_STATUS[o.trang_thai_xu_ly].tone}>{REQUEST_STATUS[o.trang_thai_xu_ly].label}</Badge>} />
          <Panel><ProgressSteps status={o.trang_thai_xu_ly} times={{ DaGui: o.ngay_tao, DangThue: o.thoi_diem_giao_xe, HoanTat: o.trang_thai_xu_ly === "HoanTat" ? o.ngay_cap_nhat : null }} /></Panel>
          {o.trang_thai_xu_ly === "HoanTat" && <Alert tone="info" title="Đơn đã hoàn tất">Dữ liệu ODO, thời gian và phí đã khóa, không chỉnh sửa được.</Alert>}
          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-6">
              <Panel title="Khách hàng & thời gian thuê">
                <DetailRow label="Khách hàng">{o.ho_ten_khach} • {o.so_dien_thoai}</DetailRow>
                <DetailRow label="Nhận dự kiến">{formatDateTime(o.thoi_gian_nhan_du_kien)}</DetailRow>
                <DetailRow label="Trả dự kiến">{formatDateTime(o.thoi_gian_tra_du_kien)}</DetailRow>
                <DetailRow label="Nhận xe tại"><DeliveryLine order={o} /></DetailRow>
                <DetailRow label="Xe"><Link className="text-primary" to={`/nhan-vien/xe/${o.ma_xe}`}>{o.ma_xe}</Link> • {o.ten_xe} • {o.loai_xe}</DetailRow>
                <DetailRow label="Đơn giá áp dụng">{formatVnd(o.don_gia_ap_dung_vnd)}/ngày</DetailRow>
                <DetailRow label="Tiền thuê dự kiến">{formatVnd(o.tien_thue_du_kien_vnd)} ({o.so_ngay_thue} ngày)</DetailRow>
              </Panel>
              <Panel title="Giao / nhận & ODO">
                <DetailRow label="ODO giao">{o.odo_giao_xe !== null ? `${formatKm(o.odo_giao_xe)} • ${formatDateTime(o.thoi_diem_giao_xe)}` : "Chưa giao xe"}</DetailRow>
                <DetailRow label="ODO nhận">{o.odo_nhan_xe !== null ? `${formatKm(o.odo_nhan_xe)} • ${formatDateTime(o.thoi_gian_tra_thuc_te)}` : "Chưa nhận xe"}</DetailRow>
                <DetailRow label="Quãng đường">{formatKm(o.quang_duong_luot_thue)}</DetailRow>
                <DetailRow label="Phụ phí trễ" tone={o.phu_phi_tre_han_vnd ? "warning" : undefined}>{o.thoi_gian_tra_thuc_te ? formatVnd(o.phu_phi_tre_han_vnd) : "Tính khi nhận xe"}</DetailRow>
              </Panel>
              {next && <div className="flex justify-end"><Link to={next.to} className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">{next.label}</Link></div>}
            </div>
            <aside className="space-y-6">
              <Panel title="Bảo đảm thuê xe">
                <DetailRow label="Hình thức">{o.ten_phuong_thuc_bao_dam ?? "Chưa chọn"}</DetailRow>
                <DetailRow label="Trạng thái"><Badge tone={DEPOSIT_STATUS[o.trang_thai_bao_dam].tone}>{DEPOSIT_STATUS[o.trang_thai_bao_dam].label}</Badge></DetailRow>
                {o.trang_thai_xu_ly === "DaXacNhan" ? (
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    <label className="flex flex-col gap-2 text-[13px] font-semibold">Hình thức bảo đảm
                      <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                        <option value="">Chọn hình thức…</option>
                        {methods.data?.map((m) => <option key={m.ma_phuong_thuc} value={m.ma_phuong_thuc}>{m.ten_phuong_thuc}</option>)}
                      </select></label>
                    <div className="flex rounded-[10px] border border-line bg-subtle p-1" role="radiogroup" aria-label="Trạng thái bảo đảm">
                      {([["ChuaKiemTra", "Chưa kiểm tra"], ["DaXacNhan", "Đã xác nhận"]] as const).map(([v, l]) => (
                        <button key={v} type="button" role="radio" aria-checked={status === v} onClick={() => setStatus(v)} className={cx("h-9 flex-1 rounded-lg text-[13px]", status === v ? "border border-primary bg-white font-semibold text-primary" : "text-ink-muted")}>{l}</button>
                      ))}
                    </div>
                    {save.isError && <Alert tone="danger" title={errorMessage(save.error)} />}
                    {save.isSuccess && !save.isPending && <Alert tone="success" title="Đã lưu trạng thái bảo đảm" />}
                    <Button className="w-full" loading={save.isPending} disabled={!method} onClick={() => save.mutate()}>Lưu bảo đảm</Button>
                    <p className="text-xs text-ink-muted">Giữ và hoàn trả thủ công tại quầy. Hệ thống không lưu ảnh giấy tờ và không thu tiền trực tuyến.</p>
                  </div>
                ) : <p className="mt-3 text-xs text-ink-muted">Chỉ chỉnh sửa bảo đảm trước khi giao xe. Bảo đảm được ghi Đã hoàn trả khi đóng đơn.</p>}
              </Panel>
              <Panel title="Nhật ký">
                <ul className="space-y-2 text-[13px]">
                  <li><span className="text-ink-muted">{formatDateTime(o.ngay_tao)}</span> • Khách gửi yêu cầu {o.ma_yeu_cau}</li>
                  {o.ten_nguoi_xac_nhan && <li>Xác nhận bởi {o.ten_nguoi_xac_nhan}</li>}
                  {o.thoi_diem_giao_xe && <li><span className="text-ink-muted">{formatDateTime(o.thoi_diem_giao_xe)}</span> • Giao xe, ODO {formatKm(o.odo_giao_xe)}</li>}
                  {o.thoi_gian_tra_thuc_te && <li><span className="text-ink-muted">{formatDateTime(o.thoi_gian_tra_thuc_te)}</span> • Nhận xe, ODO {formatKm(o.odo_nhan_xe)}</li>}
                  <li><span className="text-ink-muted">{formatDateTime(o.ngay_cap_nhat)}</span> • Cập nhật gần nhất</li>
                </ul>
              </Panel>
            </aside>
          </div>
        </>
      )}
    </StaffLayout>
  );
}
