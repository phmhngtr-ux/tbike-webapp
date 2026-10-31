import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { LateFeeCard, OrderContextBar } from "../../components/Domain";
import { Alert, Button, DetailRow, EmptyState, ErrorState, Field, inputClass, LoadingState, PageHeading, Panel } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime, formatKm, nowLocalInput, toApiDateTime } from "../../lib/format";
import { invalidateOperational, qk } from "../../services/queryKeys";
import { rentalsApi } from "../../services/rentalsApi";
import { vehiclesApi } from "../../services/vehiclesApi";
import { useOrder } from "./useOrder";

/** D2 · Nhan xe & nhap ODO tra (+ D3 xem truoc phi tre do backend tinh) */
export function ReturnPage() {
  const { maDon = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const order = useOrder(maDon);
  const o = order.data;
  const vehicle = useQuery({ queryKey: [...qk.vehicles, "detail", o?.ma_xe], queryFn: () => vehiclesApi.detail(o!.ma_xe), enabled: !!o });
  const [odo, setOdo] = useState("");
  const [at, setAt] = useState(nowLocalInput());
  const [debouncedAt, setDebouncedAt] = useState(at);
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => { const t = setTimeout(() => setDebouncedAt(at), 400); return () => clearTimeout(t); }, [at]);

  const canPreview = !!o && o.trang_thai_xu_ly === "DangThue" && !o.thoi_gian_tra_thuc_te && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(debouncedAt);
  const preview = useQuery({
    queryKey: ["late-fee-preview", maDon, debouncedAt],
    queryFn: () => rentalsApi.previewLateFee(maDon, toApiDateTime(debouncedAt)),
    enabled: canPreview,
  });
  const submit = useMutation({
    mutationFn: () => rentalsApi.returnVehicle(maDon, { odo_nhan_xe: Number(odo), thoi_gian_tra_thuc_te: toApiDateTime(at) }),
    onSuccess: async () => { await invalidateOperational(client); navigate(`/nhan-vien/don/${maDon}/hoan-tat`); },
  });

  const n = Number(odo);
  const odoValid = /^\d+$/.test(odo) && o?.odo_giao_xe !== null && o !== undefined && n >= (o.odo_giao_xe ?? 0);
  const distance = odoValid && o ? n - (o.odo_giao_xe ?? 0) : null;
  const kmSince = vehicle.data && odoValid ? n - vehicle.data.odo_bao_duong_gan_nhat : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!/^\d+$/.test(odo)) x.odo = "Nhập ODO nhận (số nguyên không âm)";
    else if (!odoValid) x.odo = `ODO nhận phải lớn hơn hoặc bằng ODO giao (${formatKm(o!.odo_giao_xe)}).`;
    if (!at) x.at = "Chọn thời gian trả thực tế";
    else if (at > nowLocalInput(5)) x.at = "Thời gian trả thực tế không được ở tương lai";
    setErrs(x);
    if (!Object.keys(x).length) submit.mutate();
  }
  const apiErr = submit.error instanceof ApiError ? submit.error : null;

  return (
    <StaffLayout breadcrumb={["Yêu cầu & đơn thuê", "Giao nhận & ODO"]}>
      {order.isLoading && <LoadingState />}
      {order.notFound && <EmptyState title={`Không tìm thấy đơn ${maDon}`} />}
      {order.isError && !order.notFound && <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />}
      {o && (
        <>
          <PageHeading eyebrow={`Đơn thuê / ${maDon}`} title="Nhận xe & ghi nhận ODO" subtitle="Đối chiếu số km và thời gian thực tế trước khi hoàn tất trả xe." />
          <OrderContextBar order={o} />
          {o.trang_thai_xu_ly !== "DangThue" || o.thoi_gian_tra_thuc_te ? (
            <Alert tone="info" title={o.thoi_gian_tra_thuc_te ? "Đơn đã được nhận xe" : "Đơn chưa giao xe"} action={<Link to={o.thoi_gian_tra_thuc_te ? `/nhan-vien/don/${maDon}/hoan-tat` : `/nhan-vien/don/${maDon}`} className="text-sm font-semibold text-primary underline">{o.thoi_gian_tra_thuc_te ? "Tới hoàn tất" : "Xem đơn"}</Link>}>
              {o.thoi_gian_tra_thuc_te ? `Nhận lúc ${formatDateTime(o.thoi_gian_tra_thuc_te)}, ODO ${formatKm(o.odo_nhan_xe)}.` : "Chỉ nhận xe với đơn đang thuê đã có thông tin bàn giao."}
            </Alert>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[1fr_400px]">
              <div className="space-y-6">
                <Panel title="Thông tin nhận xe" caption="ODO và thời gian sẽ khóa sau khi hoàn tất trả xe.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ODO giao (km) • chỉ đọc" htmlFor="odo-giao" helper="Lấy từ biên bản giao xe."><input id="odo-giao" readOnly className={inputClass} value={o.odo_giao_xe ?? ""} /></Field>
                    <Field label="ODO nhận (km)" required htmlFor="odo" error={errs.odo ?? (apiErr?.code === "ODO_LT_HANDOVER" ? apiErr.message : undefined)} helper={`Phải lớn hơn hoặc bằng ODO giao ${formatKm(o.odo_giao_xe)}.`}>
                      <input id="odo" inputMode="numeric" className={inputClass} value={odo} onChange={(e) => setOdo(e.target.value.replace(/\D/g, ""))} aria-invalid={!!errs.odo} />
                    </Field>
                  </div>
                  <div className="mt-4"><Field label="Thời gian trả thực tế" required htmlFor="at" error={errs.at ?? (apiErr?.code === "TIME_IN_FUTURE" || apiErr?.code === "RETURN_BEFORE_HANDOVER" ? apiErr.message : undefined)}>
                    <input id="at" type="datetime-local" className={inputClass} value={at} onChange={(e) => setAt(e.target.value)} /></Field></div>
                  {distance !== null && (
                    <div className="mt-4 flex items-center justify-between rounded-[10px] bg-primary-soft px-5 py-4">
                      <div><p className="text-sm font-semibold">Quãng đường tự tính</p><p className="text-xs text-ink-muted">{formatKm(n)} − {formatKm(o.odo_giao_xe)} = {formatKm(distance)}</p></div>
                      <p className="text-[32px] font-bold text-primary">{formatKm(distance)}</p>
                    </div>
                  )}
                </Panel>
                {kmSince !== null && vehicle.data && kmSince >= vehicle.data.nguong_km && (
                  <Alert tone="warning" title={`Đã chạm ngưỡng bảo dưỡng ${formatKm(vehicle.data.nguong_km)}`}>
                    ODO sau nhận {formatKm(n)} − ODO bảo dưỡng gần nhất {formatKm(vehicle.data.odo_bao_duong_gan_nhat)} = {formatKm(kmSince)}. Xe sẽ chuyển Cần bảo dưỡng khi hoàn tất; không mở cho thuê lại.
                  </Alert>
                )}
                {apiErr && !["ODO_LT_HANDOVER", "TIME_IN_FUTURE", "RETURN_BEFORE_HANDOVER"].includes(apiErr.code) && <Alert tone="danger" title="Chưa lưu được thông tin nhận xe">{apiErr.message}</Alert>}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-white p-5">
                  <Link to={`/nhan-vien/don/${maDon}`} className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-primary">Quay lại chi tiết đơn</Link>
                  <div className="flex items-center gap-3"><span className="hidden text-xs text-ink-muted sm:inline">Đơn vẫn Đang thuê đến khi xác nhận hoàn tất.</span><Button type="submit" loading={submit.isPending}>Lưu & tiếp tục hoàn tất</Button></div>
                </div>
              </div>
              <aside className="space-y-6">
                <Panel title="Giao xe • Biên bản đã lưu">
                  <DetailRow label="ODO giao đã lưu">{formatKm(o.odo_giao_xe)}</DetailRow>
                  <DetailRow label="Thời gian giao">{formatDateTime(o.thoi_diem_giao_xe)}</DetailRow>
                  <DetailRow label="Trả dự kiến">{formatDateTime(o.thoi_gian_tra_du_kien)}</DetailRow>
                  <DetailRow label="Bảo đảm đang giữ">{o.ten_phuong_thuc_bao_dam ?? "—"}</DetailRow>
                </Panel>
                <Panel title="Phí trả trễ (xem trước)" caption="Hệ thống tính theo thời gian trả bạn nhập; số chính thức được lưu khi bấm Lưu.">
                  {preview.isFetching && !preview.data && <LoadingState rows={2} label="Đang tính phí…" />}
                  {preview.isError && <ErrorState message={errorMessage(preview.error)} onRetry={() => preview.refetch()} />}
                  {preview.data && <LateFeeCard fee={preview.data} />}
                </Panel>
              </aside>
            </form>
          )}
        </>
      )}
    </StaffLayout>
  );
}
