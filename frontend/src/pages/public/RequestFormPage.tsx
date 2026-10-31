import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PublicLayout } from "../../components/PublicLayout";
import { VehiclePhoto } from "../../components/Domain";
import { IconCheckCircle, IconSend } from "../../components/Icons";
import { Alert, Badge, Button, cx, DetailRow, ErrorState, Field, inputClass, LoadingState, Panel } from "../../components/ui";
import { ApiError, errorMessage, fieldErrors } from "../../lib/api";
import { formatVnd, rentalDays, toApiDateTime } from "../../lib/format";
import type { HinhThucNhanXe, RentalRequestCreated } from "../../lib/types";
import { publicApi } from "../../services/publicApi";

/** C1 · Khach – Gui yeu cau thue */
export function RequestFormPage() {
  const { maXe = "" } = useParams();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    ho_ten_khach: "", so_dien_thoai: "", tu: params.get("tu") ?? "", den: params.get("den") ?? "",
    ghi_chu_yeu_cau: "", hinh_thuc_nhan_xe: (params.get("giao") === "GiaoTanNoi" ? "GiaoTanNoi" : "TaiCuaHang") as HinhThucNhanXe,
    dia_chi_giao_xe: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<RentalRequestCreated | null>(null);

  const vehicles = useQuery({ queryKey: ["public-vehicles", "all"], queryFn: () => publicApi.vehicles({}) });
  const vehicle = vehicles.data?.find((v) => v.ma_xe === maXe);
  const days = form.tu && form.den && form.den > form.tu ? rentalDays(toApiDateTime(form.tu), toApiDateTime(form.den)) : null;
  const estimate = useMemo(() => (vehicle && days ? vehicle.don_gia_ngay_vnd * days : null), [vehicle, days]);

  const submit = useMutation({
    mutationFn: () => publicApi.createRequest({
      ma_xe: maXe, ho_ten_khach: form.ho_ten_khach, so_dien_thoai: form.so_dien_thoai,
      thoi_gian_nhan_du_kien: toApiDateTime(form.tu), thoi_gian_tra_du_kien: toApiDateTime(form.den),
      ghi_chu_yeu_cau: form.ghi_chu_yeu_cau || null, hinh_thuc_nhan_xe: form.hinh_thuc_nhan_xe,
      dia_chi_giao_xe: form.hinh_thuc_nhan_xe === "GiaoTanNoi" ? form.dia_chi_giao_xe : null,
    }),
    onSuccess: (res) => setCreated(res),
    onError: (err) => setErrors(fieldErrors(err)),
  });

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (form.ho_ten_khach.trim().length < 2) e.ho_ten_khach = "Vui lòng nhập họ và tên";
    if (!/^0\d{9,10}$/.test(form.so_dien_thoai.replace(/[\s.-]/g, ""))) e.so_dien_thoai = "Số điện thoại gồm 10–11 chữ số và bắt đầu bằng 0";
    if (!form.tu) e.tu = "Chọn thời gian nhận xe";
    if (!form.den) e.den = "Chọn thời gian trả xe";
    else if (form.tu && form.den <= form.tu) e.den = "Thời gian trả phải sau thời gian nhận xe";
    if (form.hinh_thuc_nhan_xe === "GiaoTanNoi" && !form.dia_chi_giao_xe.trim()) e.dia_chi_giao_xe = "Vui lòng nhập địa chỉ giao xe, hoặc chọn Nhận tại cửa hàng";
    return e;
  }
  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) submit.mutate();
  }
  const set = (k: keyof typeof form) => (ev: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const apiErr = submit.error instanceof ApiError ? submit.error : null;

  if (created) {
    return (
      <PublicLayout stickyCta={false}>
        <div className="mx-auto max-w-xl px-5 py-16">
          <div className="space-y-5 rounded-2xl border border-success/20 bg-success-bg p-8">
            <div className="flex items-center gap-3"><IconCheckCircle className="text-success" size={26} /><h1 className="text-2xl font-semibold text-ink">Đã gửi yêu cầu của bạn</h1></div>
            <div className="flex items-center justify-between rounded-xl bg-white px-5 py-4"><span className="text-2xl font-bold tracking-wide text-ink">{created.ma_yeu_cau}</span><Badge tone="info">Đã gửi</Badge></div>
            <p className="text-sm text-ink">{created.thong_bao}</p>
            <p className="text-sm text-ink-muted">Lưu lại mã yêu cầu và số điện thoại {form.so_dien_thoai} để tra cứu trạng thái.</p>
            <Link to={`/tra-cuu?ma=${created.ma_yeu_cau}`} className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-primary">Tra cứu yêu cầu</Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout stickyCta={false}>
      <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-8 lg:px-20 lg:py-10">
        <nav className="text-[13px] text-ink-muted" aria-label="Breadcrumb"><Link to="/thue-xe" className="hover:text-primary">Chọn xe</Link> / Gửi yêu cầu thuê</nav>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-page text-ink">Gửi yêu cầu thuê xe</h1><p className="mt-1.5 text-sm text-ink-muted">Điền thông tin để cửa hàng kiểm tra lịch và liên hệ xác nhận với bạn.</p></div>
          <Badge tone="info">Yêu cầu thuê xe</Badge>
        </div>
        {vehicles.isLoading && <LoadingState />}
        {vehicles.isError && <ErrorState message={errorMessage(vehicles.error)} onRetry={() => vehicles.refetch()} />}
        {vehicles.data && !vehicle && <Alert tone="danger" title="Không tìm thấy xe đã chọn"><Link to="/thue-xe" className="underline">Quay lại chọn xe</Link></Alert>}
        {vehicle && (
          <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_440px]">
            <div className="space-y-6">
              {apiErr && (
                <Alert tone={apiErr.code === "VEHICLE_UNAVAILABLE" ? "warning" : "danger"} title={apiErr.code === "VEHICLE_UNAVAILABLE" ? `${vehicle.ma_xe} không còn khả dụng trong thời gian này` : apiErr.message}
                  action={apiErr.code === "VEHICLE_UNAVAILABLE" ? <Link to="/thue-xe" className="text-sm font-semibold text-primary underline">Chọn xe khác</Link> : undefined}>
                  {apiErr.code === "VEHICLE_UNAVAILABLE" ? apiErr.message + " Thông tin bạn đã nhập vẫn được giữ." : null}
                </Alert>
              )}
              <Panel title="Thông tin người thuê" caption="Thông tin có dấu * là bắt buộc.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Họ và tên" required htmlFor="ho_ten" error={errors.ho_ten_khach}><input id="ho_ten" className={inputClass} value={form.ho_ten_khach} onChange={set("ho_ten_khach")} aria-invalid={!!errors.ho_ten_khach} autoComplete="name" maxLength={100} /></Field>
                  <Field label="Số điện thoại" required htmlFor="sdt" error={errors.so_dien_thoai} helper="Dùng SĐT này để tra cứu yêu cầu."><input id="sdt" inputMode="tel" className={inputClass} value={form.so_dien_thoai} onChange={set("so_dien_thoai")} aria-invalid={!!errors.so_dien_thoai} autoComplete="tel" /></Field>
                </div>
                <div className="mt-5"><Alert tone="info" title="Gửi yêu cầu chưa phải xác nhận thuê">Cửa hàng sẽ kiểm tra lịch xe và liên hệ xác nhận. Chưa thu bảo đảm tại bước này.</Alert></div>
              </Panel>
              <Panel title="Thời gian & ghi chú">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ngày, giờ nhận xe" required htmlFor="tu" error={errors.tu ?? errors.thoi_gian_nhan_du_kien}><input id="tu" type="datetime-local" className={inputClass} value={form.tu} onChange={set("tu")} aria-invalid={!!errors.tu} /></Field>
                  <Field label="Ngày, giờ trả xe" required htmlFor="den" error={errors.den ?? errors.thoi_gian_tra_du_kien}><input id="den" type="datetime-local" className={inputClass} value={form.den} onChange={set("den")} aria-invalid={!!errors.den} /></Field>
                </div>
                <fieldset className="mt-5 space-y-3">
                  <legend className="text-[13px] font-semibold text-ink">Hình thức nhận xe *</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([["TaiCuaHang", "Nhận tại cửa hàng", "110 Trần Văn Dư, Ngũ Hành Sơn"], ["GiaoTanNoi", "Giao xe tận nơi", "Miễn phí trong bán kính 5 km"]] as const).map(([v, t, s]) => (
                      <label key={v} className={cx("flex cursor-pointer items-start gap-3 rounded-[10px] border px-4 py-3.5", form.hinh_thuc_nhan_xe === v ? "border-2 border-primary bg-primary-soft" : "border-line")}>
                        <input type="radio" name="giao" value={v} checked={form.hinh_thuc_nhan_xe === v} onChange={set("hinh_thuc_nhan_xe")} className="mt-1 accent-primary" />
                        <span><span className="block text-sm font-semibold text-ink">{t}</span><span className="text-xs text-ink-muted">{s}</span></span>
                      </label>
                    ))}
                  </div>
                  {form.hinh_thuc_nhan_xe === "GiaoTanNoi" && (
                    <Field label="Địa chỉ giao xe" required htmlFor="dia_chi" error={errors.dia_chi_giao_xe} helper="Ngoài phạm vi 5 km, cửa hàng sẽ báo phí khi gọi xác nhận. Xe được trả lại tại cửa hàng.">
                      <input id="dia_chi" className={inputClass} value={form.dia_chi_giao_xe} onChange={set("dia_chi_giao_xe")} aria-invalid={!!errors.dia_chi_giao_xe} maxLength={255} />
                    </Field>
                  )}
                </fieldset>
                <div className="mt-5"><Field label="Ghi chú" htmlFor="ghi_chu"><textarea id="ghi_chu" className={cx(inputClass, "h-24 py-2.5")} value={form.ghi_chu_yeu_cau} onChange={set("ghi_chu_yeu_cau")} maxLength={255} /></Field></div>
                <p className="mt-3 text-xs text-ink-muted">Thời gian trả phải sau thời gian nhận.{days ? ` Tổng thời gian đã chọn: ${days} ngày.` : ""}</p>
              </Panel>
              <div className="flex items-center justify-between gap-3">
                <Link to="/thue-xe" className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-primary">Quay lại chọn xe</Link>
                <Button type="submit" loading={submit.isPending} icon={<IconSend size={16} />}>Gửi yêu cầu</Button>
              </div>
              <p className="text-xs text-ink-muted">Gửi yêu cầu không thu tiền và chưa giữ xe. Nhân viên sẽ xác nhận sau khi kiểm tra lịch xe và bảo đảm thuê.</p>
            </div>
            <aside className="space-y-6">
              <Panel title="Xe bạn đã chọn">
                <div className="flex items-center gap-4">
                  <div className="h-[72px] w-[104px] rounded-lg bg-subtle"><VehiclePhoto tenXe={vehicle.ten_xe} className="h-full w-full" /></div>
                  <div><p className="text-xs text-ink-muted">{vehicle.ma_xe} • {vehicle.loai_xe}</p><p className="text-sm font-semibold text-ink">{vehicle.ten_xe}</p></div>
                </div>
                <hr className="my-4 border-line" />
                <DetailRow label="Đơn giá">{formatVnd(vehicle.don_gia_ngay_vnd)}/ngày</DetailRow>
                <DetailRow label="Thời gian">{days ? `${days} ngày` : "—"}</DetailRow>
                <DetailRow label="Nhận xe">{form.hinh_thuc_nhan_xe === "GiaoTanNoi" ? "Giao tận nơi • 0đ" : "Tại cửa hàng"}</DetailRow>
                <DetailRow label="Tiền thuê dự kiến">{estimate ? formatVnd(estimate) : "—"}</DetailRow>
                <p className="mt-3 text-xs text-ink-muted">Số tiền tạm tính; giá chính thức được chốt khi cửa hàng xác nhận. Phụ phí trả trễ tính khi trả xe thực tế. Bảo đảm thuê xử lý riêng tại cửa hàng.</p>
              </Panel>
            </aside>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}
