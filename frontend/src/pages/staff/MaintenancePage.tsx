import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { IconCheckCircle } from "../../components/Icons";
import { Alert, Badge, Button, cx, DetailRow, EmptyState, ErrorState, Field, inputClass, LoadingState, PageHeading, Panel } from "../../components/ui";
import { ApiError, errorMessage, fieldErrors } from "../../lib/api";
import { formatDate, formatKm, todayVn } from "../../lib/format";
import { VEHICLE_STATUS } from "../../lib/status";
import type { MaintenanceCreated } from "../../lib/types";
import { invalidateOperational, qk } from "../../services/queryKeys";
import { vehiclesApi } from "../../services/vehiclesApi";

/** B3 · Xe can bao duong & ghi nhan hoan tat (FR-09, BRULE-04) */
export function MaintenancePage() {
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selected = params.get("xe");
  const due = useQuery({ queryKey: [...qk.maintenance, "due"], queryFn: vehiclesApi.due });
  const vehicle = useQuery({ queryKey: [...qk.vehicles, "detail", selected], queryFn: () => vehiclesApi.detail(selected!), enabled: !!selected });
  const [odo, setOdo] = useState("");
  const [ngay, setNgay] = useState(todayVn());
  const [ghiChu, setGhiChu] = useState("");
  const [localErr, setLocalErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState<MaintenanceCreated | null>(null);

  useEffect(() => {
    if (vehicle.data) setOdo(String(vehicle.data.odo_hien_tai));
    setLocalErr({});
  }, [vehicle.data?.ma_xe]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => vehiclesApi.recordMaintenance(selected!, { ngay_bao_duong: ngay, odo_luc_bao_duong: Number(odo), ghi_chu: ghiChu || null }),
    onSuccess: async (res) => {
      setDone(res);
      setGhiChu("");
      await invalidateOperational(client);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = vehicle.data!;
    const errs: Record<string, string> = {};
    const n = Number(odo);
    if (!/^\d+$/.test(odo)) errs.odo_luc_bao_duong = "ODO là số nguyên không âm";
    else if (n < v.odo_hien_tai) errs.odo_luc_bao_duong = `ODO bảo dưỡng không được nhỏ hơn ODO hiện tại (${formatKm(v.odo_hien_tai)}).`;
    if (!ngay) errs.ngay_bao_duong = "Chọn ngày hoàn tất bảo dưỡng";
    else if (ngay > todayVn()) errs.ngay_bao_duong = "Ngày bảo dưỡng không được ở tương lai";
    setLocalErr(errs);
    if (!Object.keys(errs).length) save.mutate();
  }
  const apiFields = fieldErrors(save.error);
  const apiErr = save.error instanceof ApiError ? save.error : null;
  const v = vehicle.data;
  const odoErr = localErr.odo_luc_bao_duong ?? apiFields.odo_luc_bao_duong ?? (apiErr?.code === "ODO_LT_CURRENT" ? apiErr.message : undefined);

  return (
    <StaffLayout breadcrumb={["Bảo dưỡng"]}>
      <PageHeading eyebrow="Bảo dưỡng định kỳ" title="Xe cần bảo dưỡng" subtitle="Xe được gắn cảnh báo khi ODO hiện tại − ODO lần bảo dưỡng gần nhất ≥ 2.000 km (BRULE-04). Xe ở trạng thái này bị khóa cho thuê." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title={due.data ? `${due.data.length} xe cần bảo dưỡng` : "Xe cần bảo dưỡng"} caption="Sắp xếp theo số km vượt ngưỡng, cao nhất trước.">
          {due.isLoading && <LoadingState />}
          {due.isError && <ErrorState message={errorMessage(due.error)} onRetry={() => due.refetch()} />}
          {due.data?.length === 0 && <EmptyState icon={<IconCheckCircle size={32} className="text-success" />} title="Tất cả xe đều dưới ngưỡng 2.000 km" />}
          {!!due.data?.length && (
            <div className="overflow-x-auto rounded-[10px] border border-line"><table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr className="bg-subtle text-eyebrow uppercase text-ink-muted"><th className="px-4 py-3">Mã xe</th><th className="px-4 py-3">Xe</th><th className="px-4 py-3">ODO hiện tại</th><th className="px-4 py-3">ODO BD gần nhất</th><th className="px-4 py-3">Đã đi từ BD</th><th /></tr></thead>
              <tbody>{due.data.map((x) => (
                <tr key={x.ma_xe} className={cx("border-t border-line", selected === x.ma_xe && "bg-primary-soft")}>
                  <td className="px-4 py-3.5 font-semibold text-primary">{x.ma_xe}</td>
                  <td className="px-4 py-3.5"><p className="font-semibold">{x.ten_xe}</p><p className="text-xs text-ink-muted">{x.loai_xe}</p></td>
                  <td className="px-4 py-3.5">{formatKm(x.odo_hien_tai)}</td><td className="px-4 py-3.5">{formatKm(x.odo_bao_duong_gan_nhat)}</td>
                  <td className="px-4 py-3.5 font-semibold text-warning">{formatKm(x.km_tu_lan_bao_duong)}</td>
                  <td className="px-4 py-3.5 text-right">{selected === x.ma_xe ? <Badge tone="info">Đang ghi nhận</Badge> :
                    <Button size="sm" variant="secondary" disabled={x.trang_thai === "DangThue"} title={x.trang_thai === "DangThue" ? "Xe đang được thuê" : undefined} onClick={() => { setDone(null); save.reset(); setParams({ xe: x.ma_xe }); }}>Ghi nhận</Button>}</td>
                </tr>))}</tbody>
            </table></div>
          )}
          <p className="mt-3 text-xs text-ink-muted">Ghi nhận hoàn tất chỉ dùng sau khi xe đã được bảo dưỡng thực tế. Hệ thống không tự gỡ cảnh báo.</p>
        </Panel>
        <Panel title="Ghi nhận bảo dưỡng hoàn tất" caption={v ? `${v.ma_xe} • ${v.ten_xe} • ${v.loai_xe}` : "Chọn một xe trong danh sách"}>
          {!selected && <p className="text-[13px] text-ink-muted">Chọn “Ghi nhận” ở xe đã bảo dưỡng xong, hoặc mở từ trang chi tiết xe.</p>}
          {selected && vehicle.isLoading && <LoadingState rows={3} />}
          {selected && vehicle.isError && <ErrorState message={errorMessage(vehicle.error)} />}
          {done && done.xe.ma_xe === selected && (
            <div className="mb-4 space-y-3"><Alert tone="success" title={`Đã ghi nhận bảo dưỡng ${done.xe.ma_xe}`}>Mốc mới {formatKm(done.ban_ghi.odo_luc_bao_duong)} • Mốc tiếp theo {formatKm(done.moc_bao_duong_tiep_theo_km)}. Xe đã chuyển sang {VEHICLE_STATUS[done.xe.trang_thai].label}.</Alert>
              <Link to={`/nhan-vien/xe/${done.xe.ma_xe}`} className="text-[13px] font-semibold text-primary underline">Xem chi tiết xe</Link></div>
          )}
          {v && !(done && done.xe.ma_xe === selected) && (
            <form onSubmit={submit} noValidate className="space-y-4">
              <Badge tone={VEHICLE_STATUS[v.trang_thai].tone}>{VEHICLE_STATUS[v.trang_thai].label}</Badge>
              <div><DetailRow label="ODO hiện tại (hệ thống)">{formatKm(v.odo_hien_tai)}</DetailRow>
                <DetailRow label="ODO lần bảo dưỡng gần nhất">{formatKm(v.odo_bao_duong_gan_nhat)}{v.ngay_bao_duong_gan_nhat ? ` • ${formatDate(v.ngay_bao_duong_gan_nhat)}` : ""}</DetailRow>
                <DetailRow label="Đã đi từ lần bảo dưỡng" tone={v.can_bao_duong ? "warning" : undefined}>{formatKm(v.km_tu_lan_bao_duong)}</DetailRow></div>
              <hr className="border-line" />
              {v.trang_thai === "DangThue" && <Alert tone="warning" title="Xe đang được thuê">Chỉ ghi nhận bảo dưỡng sau khi nhận lại xe.</Alert>}
              <Field label="ODO tại thời điểm bảo dưỡng (km)" required htmlFor="odo" error={odoErr} helper={`Phải ≥ ODO hiện tại ${formatKm(v.odo_hien_tai)}. Đây là mốc theo dõi mới.`}>
                <input id="odo" inputMode="numeric" className={inputClass} value={odo} onChange={(e) => setOdo(e.target.value.replace(/\D/g, ""))} aria-invalid={!!odoErr} />
              </Field>
              <Field label="Ngày hoàn tất bảo dưỡng" required htmlFor="ngay" error={localErr.ngay_bao_duong ?? apiFields.ngay_bao_duong ?? (apiErr?.code?.startsWith("DATE") ? apiErr.message : undefined)}>
                <input id="ngay" type="date" max={todayVn()} className={inputClass} value={ngay} onChange={(e) => setNgay(e.target.value)} />
              </Field>
              <Field label="Nội dung bảo dưỡng" htmlFor="ghichu" helper="Không bắt buộc. Lưu vào lịch sử bảo dưỡng của xe."><input id="ghichu" maxLength={255} className={inputClass} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Thay nhớt, kiểm tra phanh, lốp, bugi" /></Field>
              {/^\d+$/.test(odo) && Number(odo) >= v.odo_hien_tai && (
                <div className="rounded-[10px] bg-primary-soft px-4 py-3.5"><p className="text-eyebrow uppercase text-primary">Sau khi lưu</p><p className="text-sm font-semibold">Mốc bảo dưỡng tiếp theo: {formatKm(Number(odo) + v.nguong_km)}</p><p className="text-[13px] text-ink-muted">Cảnh báo được gỡ • Xe chuyển sang Khả dụng.</p></div>
              )}
              {apiErr && !odoErr && !apiErr.code.startsWith("DATE") && <Alert tone="danger" title={apiErr.message} />}
              <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setParams({})}>Hủy</Button><Button type="submit" loading={save.isPending} disabled={v.trang_thai === "DangThue"}>Lưu ghi nhận</Button></div>
            </form>
          )}
        </Panel>
      </div>
    </StaffLayout>
  );
}
