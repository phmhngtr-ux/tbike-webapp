import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "../../components/PublicLayout";
import { VehiclePhoto } from "../../components/Domain";
import { IconSearch } from "../../components/Icons";
import { Alert, Badge, Button, cx, EmptyState, ErrorState, Field, inputClass, LoadingState } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { formatDateTime, formatVnd, rentalDays, toApiDateTime } from "../../lib/format";
import { VEHICLE_TYPE } from "../../lib/status";
import type { LoaiXe } from "../../lib/types";
import { publicApi } from "../../services/publicApi";

/** C0 · Khach – Chon xe kha dung */
export function VehicleListPage() {
  const [params, setParams] = useSearchParams();
  const [tu, setTu] = useState(params.get("tu") ?? "");
  const [den, setDen] = useState(params.get("den") ?? "");
  const [rangeError, setRangeError] = useState("");
  const loai = (params.get("loai") ?? "") as LoaiXe | "";
  const appliedTu = params.get("tu") ?? "";
  const appliedDen = params.get("den") ?? "";

  const query = useQuery({
    queryKey: ["public-vehicles", appliedTu, appliedDen, loai],
    queryFn: () => publicApi.vehicles({
      tu: appliedTu ? toApiDateTime(appliedTu) : undefined,
      den: appliedDen ? toApiDateTime(appliedDen) : undefined,
      loai_xe: loai,
    }),
  });

  function apply(e: FormEvent) {
    e.preventDefault();
    if ((tu && !den) || (!tu && den)) return setRangeError("Chọn cả thời gian nhận và trả xe");
    if (tu && den && den <= tu) return setRangeError("Thời gian trả phải sau thời gian nhận xe");
    setRangeError("");
    const next = new URLSearchParams(params);
    tu ? next.set("tu", tu) : next.delete("tu");
    den ? next.set("den", den) : next.delete("den");
    setParams(next);
  }
  function setLoai(v: LoaiXe | "") {
    const next = new URLSearchParams(params);
    v ? next.set("loai", v) : next.delete("loai");
    setParams(next);
  }

  const available = useMemo(() => query.data?.filter((v) => v.kha_dung).length ?? 0, [query.data]);
  const days = appliedTu && appliedDen ? rentalDays(toApiDateTime(appliedTu), toApiDateTime(appliedDen)) : null;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-[1440px] space-y-6 px-5 py-8 lg:px-20 lg:py-10">
        <div>
          <p className="text-eyebrow uppercase text-ink-muted">T-Bike for rent / Thuê xe máy</p>
          <h1 className="mt-1.5 text-page text-ink">Chọn xe cho hành trình của bạn</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Chọn thời gian, tìm xe phù hợp và gửi yêu cầu đến cửa hàng.</p>
        </div>
        <form onSubmit={apply} className="rounded-panel border border-line bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold text-ink">Bạn muốn thuê xe khi nào?</h2>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_336px_auto] lg:items-end">
            <Field label="Ngày, giờ nhận xe" htmlFor="c0-tu"><input id="c0-tu" type="datetime-local" className={inputClass} value={tu} onChange={(e) => setTu(e.target.value)} /></Field>
            <Field label="Ngày, giờ trả xe" htmlFor="c0-den" error={rangeError}><input id="c0-den" type="datetime-local" className={inputClass} value={den} aria-invalid={!!rangeError} onChange={(e) => setDen(e.target.value)} /></Field>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-ink" id="c0-loai">Loại xe</span>
              <div role="radiogroup" aria-labelledby="c0-loai" className="flex rounded-lg border border-line bg-subtle p-1">
                {([["", "Tất cả"], ["Manual", "Manual"], ["Automatic", "Automatic"]] as const).map(([v, l]) => (
                  <button key={l} type="button" role="radio" aria-checked={loai === v} onClick={() => setLoai(v)}
                    className={cx("h-9 flex-1 rounded-md text-[13px]", loai === v ? "bg-primary-soft font-semibold text-primary" : "text-ink-muted")}>{l}</button>
                ))}
              </div>
            </div>
            <Button type="submit" icon={<IconSearch size={16} />}>Tìm xe</Button>
          </div>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-semibold text-ink">{query.data ? `${query.data.length} xe • ${available} xe khả dụng` : "Danh sách xe"}</p>
          {appliedTu && appliedDen && <p className="text-[13px] text-ink-muted">{formatDateTime(toApiDateTime(appliedTu))} → {formatDateTime(toApiDateTime(appliedDen))} • {days} ngày</p>}
        </div>
        {query.isLoading && <LoadingState label="Đang tải danh sách xe…" />}
        {query.isError && <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />}
        {query.data && query.data.length === 0 && <EmptyState title="Không có xe phù hợp" description="Thử bỏ bớt bộ lọc loại xe." action={<Button variant="secondary" onClick={() => setLoai("")}>Xóa bộ lọc</Button>} />}
        {query.data && query.data.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.map((v) => {
              const link = `/thue-xe/${v.ma_xe}/dat?${new URLSearchParams({ ...(appliedTu && { tu: appliedTu }), ...(appliedDen && { den: appliedDen }), ...(params.get("giao") && { giao: params.get("giao")! }) })}`;
              return (
                <article key={v.ma_xe} className="overflow-hidden rounded-panel border border-line bg-white">
                  <div className="flex h-[104px] items-center justify-between bg-subtle px-4">
                    <div className="space-y-2"><p className="text-xs text-ink-muted">{v.ma_xe}</p>
                      <Badge tone={v.kha_dung ? "success" : v.ly_do?.includes("bảo dưỡng") ? "warning" : "info"}>{v.kha_dung ? "Khả dụng" : v.ly_do?.includes("bảo dưỡng") ? "Cần bảo dưỡng" : "Đang thuê"}</Badge>
                    </div>
                    <VehiclePhoto tenXe={v.ten_xe} className="h-[88px] w-[160px]" />
                  </div>
                  <div className="space-y-3 p-4">
                    <h3 className="text-lg font-semibold text-ink">{v.ten_xe}</h3>
                    <p className="text-[13px] text-ink-muted">{VEHICLE_TYPE[v.loai_xe]}</p>
                    <p><span className="text-2xl font-bold text-primary">{formatVnd(v.don_gia_ngay_vnd)}</span> <span className="text-[13px] text-ink-muted">/ ngày</span></p>
                    <hr className="border-line" />
                    <p className={cx("text-xs", v.kha_dung ? "text-success" : "text-ink-muted")}>{v.kha_dung ? "Sẵn sàng trong thời gian bạn chọn" : v.ly_do}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">{days ? `Thời gian thuê: ${days} ngày` : "Chọn thời gian để kiểm tra lịch"}</span>
                      {v.kha_dung ? <Link to={link} className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">Chọn thuê</Link>
                        : <Button disabled>Không khả dụng</Button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <Alert tone="info" title="Chỉ xe Khả dụng được chọn thuê">Xe Đang thuê hoặc Cần bảo dưỡng tạm khóa thao tác chọn thuê. Đổi thời gian hoặc chọn xe khác.</Alert>
      </div>
    </PublicLayout>
  );
}
