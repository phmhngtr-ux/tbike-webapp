import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { OrderContextBar } from "../../components/Domain";
import { IconCheckCircle, IconXCircle } from "../../components/Icons";
import { Alert, Button, DetailRow, EmptyState, ErrorState, Field, inputClass, LoadingState, PageHeading, Panel } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime, formatKm, formatVnd, nowLocalInput, toApiDateTime } from "../../lib/format";
import { invalidateOperational, qk } from "../../services/queryKeys";
import { vehiclesApi } from "../../services/vehiclesApi";
import { rentalsApi } from "../../services/rentalsApi";
import { useOrder } from "./useOrder";

/** D1 · Giao xe & nhap ODO ban giao */
export function HandoverPage() {
  const { maDon = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const order = useOrder(maDon);
  const o = order.data;
  const vehicle = useQuery({ queryKey: [...qk.vehicles, "detail", o?.ma_xe], queryFn: () => vehiclesApi.detail(o!.ma_xe), enabled: !!o });
  const [odo, setOdo] = useState("");
  const [at, setAt] = useState(nowLocalInput());
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => { if (vehicle.data && !odo) setOdo(String(vehicle.data.odo_hien_tai)); }, [vehicle.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useMutation({
    mutationFn: () => rentalsApi.handover(maDon, { odo_giao_xe: Number(odo), thoi_diem_giao_xe: toApiDateTime(at) }),
    onSuccess: async () => { await invalidateOperational(client); navigate(`/nhan-vien/don/${maDon}`); },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = vehicle.data!;
    const n: Record<string, string> = {};
    if (!/^\d+$/.test(odo)) n.odo = "ODO là số nguyên không âm";
    else if (Number(odo) < v.odo_hien_tai) n.odo = `ODO bàn giao không được nhỏ hơn ODO hiện tại của xe (${formatKm(v.odo_hien_tai)}).`;
    if (!at) n.at = "Chọn thời điểm giao xe";
    else if (at > nowLocalInput(5)) n.at = "Thời điểm giao xe không được ở tương lai";
    setErrs(n);
    if (!Object.keys(n).length) submit.mutate();
  }
  const apiErr = submit.error instanceof ApiError ? submit.error : null;
  const depositOk = o?.trang_thai_bao_dam === "DaXacNhan" && !!o.ma_phuong_thuc_bao_dam;
  const vehicleOk = vehicle.data && vehicle.data.trang_thai === "KhaDung";
  const checks = o && vehicle.data ? [
    { ok: depositOk, text: depositOk ? `Bảo đảm: ${o.ten_phuong_thuc_bao_dam} — Đã xác nhận` : "Bảo đảm chưa ở trạng thái Đã xác nhận" },
    { ok: vehicle.data.trang_thai !== "CanBaoDuong", text: vehicle.data.trang_thai === "CanBaoDuong" ? "Xe đang cần bảo dưỡng — không được giao" : `Xe không có cảnh báo bảo dưỡng (đã đi ${formatKm(vehicle.data.km_tu_lan_bao_duong)} / ${formatKm(vehicle.data.nguong_km)})` },
    { ok: vehicle.data.trang_thai !== "DangThue", text: vehicle.data.trang_thai === "DangThue" ? "Xe đang được thuê trong đơn khác" : "Xe đang ở cửa hàng, sẵn sàng giao" },
  ] : [];

  return (
    <StaffLayout breadcrumb={["Yêu cầu & đơn thuê", "Giao xe"]}>
      {order.isLoading && <LoadingState />}
      {order.notFound && <EmptyState title={`Không tìm thấy đơn ${maDon}`} />}
      {order.isError && !order.notFound && <ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} />}
      {o && (
        <>
          <PageHeading eyebrow={`Đơn thuê / ${maDon}`} title="Giao xe & ghi nhận ODO" subtitle="Nhập ODO và thời điểm bàn giao. Sau khi xác nhận, đơn và xe chuyển sang Đang thuê." />
          <OrderContextBar order={o} />
          {o.trang_thai_xu_ly !== "DaXacNhan" ? (
            <Alert tone="info" title={o.thoi_diem_giao_xe ? "Đơn đã được giao xe" : "Đơn chưa đủ điều kiện giao xe"} action={<Link to={`/nhan-vien/don/${maDon}`} className="text-sm font-semibold text-primary underline">Xem đơn</Link>}>
              {o.thoi_diem_giao_xe ? `Giao lúc ${formatDateTime(o.thoi_diem_giao_xe)}, ODO ${formatKm(o.odo_giao_xe)}.` : "Chỉ đơn Đã xác nhận mới được giao xe."}
            </Alert>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[1fr_400px]">
              <Panel title="Thông tin giao xe" caption="Các trường có dấu * là bắt buộc.">
                {vehicle.isLoading && <LoadingState rows={2} />}
                {vehicle.data && (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="ODO hiện tại của xe (km)" htmlFor="odo-cur" helper={`Lấy từ hồ sơ xe ${vehicle.data.ma_xe}.`}><input id="odo-cur" readOnly className={inputClass} value={vehicle.data.odo_hien_tai} /></Field>
                      <Field label="ODO bàn giao (km)" required htmlFor="odo" error={errs.odo ?? (apiErr?.code === "ODO_LT_CURRENT" ? apiErr.message : undefined)} helper={`Phải ≥ ODO hiện tại ${formatKm(vehicle.data.odo_hien_tai)}.`}>
                        <input id="odo" inputMode="numeric" className={inputClass} value={odo} onChange={(e) => setOdo(e.target.value.replace(/\D/g, ""))} aria-invalid={!!errs.odo} />
                      </Field>
                    </div>
                    <Field label="Thời điểm giao xe" required htmlFor="at" error={errs.at ?? (apiErr?.code === "TIME_IN_FUTURE" ? apiErr.message : undefined)} helper="Mặc định là thời điểm hiện tại, có thể chỉnh nếu ghi bù.">
                      <input id="at" type="datetime-local" className={inputClass} value={at} onChange={(e) => setAt(e.target.value)} />
                    </Field>
                    {o.hinh_thuc_nhan_xe === "GiaoTanNoi" && <Alert tone="info" title="Đơn giao xe tận nơi">Nhập ODO và thời điểm giao tại lúc trao xe cho khách (sau khi đã chạy tới địa chỉ). Quãng đường đi giao vẫn được cộng vào ODO để theo dõi mốc bảo dưỡng.</Alert>}
                    <div className="space-y-2.5 rounded-[10px] bg-subtle p-4">
                      <p className="text-eyebrow uppercase text-ink-muted">Kiểm tra trước khi giao</p>
                      {checks.map((c) => <p key={c.text} className="flex items-center gap-2.5 text-[13px]">{c.ok ? <IconCheckCircle className="text-success" /> : <IconXCircle className="text-danger" />}{c.text}</p>)}
                    </div>
                    <Alert tone="info" title="Giấy tờ và tiền cọc xử lý thủ công">Hệ thống chỉ lưu trạng thái bảo đảm, không lưu ảnh CCCD và không thu tiền trực tuyến.</Alert>
                    {apiErr && !["ODO_LT_CURRENT", "TIME_IN_FUTURE"].includes(apiErr.code) && <Alert tone="danger" title="Chưa lưu được thông tin giao xe">{apiErr.message}</Alert>}
                  </div>
                )}
              </Panel>
              <aside className="space-y-6">
                <Panel title="Tóm tắt đơn">
                  {o.dia_chi_giao_xe && <DetailRow label="Địa điểm giao">{o.dia_chi_giao_xe}</DetailRow>}
                  <DetailRow label="Nhận dự kiến">{formatDateTime(o.thoi_gian_nhan_du_kien)}</DetailRow>
                  <DetailRow label="Trả dự kiến">{formatDateTime(o.thoi_gian_tra_du_kien)}</DetailRow>
                  <DetailRow label="Số ngày thuê">{o.so_ngay_thue} ngày</DetailRow>
                  <DetailRow label="Đơn giá áp dụng">{formatVnd(o.don_gia_ap_dung_vnd)}/ngày</DetailRow>
                  <DetailRow label="Tiền thuê dự kiến">{formatVnd(o.tien_thue_du_kien_vnd)}</DetailRow>
                </Panel>
                <div className="rounded-panel bg-primary-soft p-6 text-[13px]">
                  <p className="text-eyebrow uppercase text-primary">Sau khi xác nhận giao xe</p>
                  <p className="mt-2">Đơn {maDon}: Đã xác nhận → Đang thuê<br />Xe {o.ma_xe}: Khả dụng → Đang thuê<br />ODO giao được khóa làm mốc tính quãng đường khi nhận xe.</p>
                </div>
                {!depositOk && <Alert tone="warning" title="Cần xác nhận bảo đảm trước" action={<Link to={`/nhan-vien/don/${maDon}`} className="text-sm font-semibold text-primary underline">Cập nhật</Link>} />}
                <div className="flex justify-end gap-3">
                  <Link to={`/nhan-vien/don/${maDon}`} className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-primary">Quay lại</Link>
                  <Button type="submit" loading={submit.isPending} disabled={!depositOk || !vehicleOk}>Xác nhận giao xe</Button>
                </div>
              </aside>
            </form>
          )}
        </>
      )}
    </StaffLayout>
  );
}
