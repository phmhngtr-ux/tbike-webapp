import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { Badge, Button, cx, EmptyState, ErrorState, inputClass, LoadingState, PageHeading, Pagination, ProgressBar } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { formatKm, formatVnd } from "../../lib/format";
import { VEHICLE_STATUS, VEHICLE_TYPE } from "../../lib/status";
import type { LoaiXe, TrangThaiXe } from "../../lib/types";
import { qk } from "../../services/queryKeys";
import { staffApi } from "../../services/staffApi";
import { vehiclesApi } from "../../services/vehiclesApi";

const PAGE_SIZE = 10;

/** B1 · Danh sach xe */
export function VehiclesPage() {
  const [params, setParams] = useSearchParams();
  const trang_thai = (params.get("trang_thai") ?? "") as TrangThaiXe | "";
  const loai_xe = (params.get("loai_xe") ?? "") as LoaiXe | "";
  const sort = (params.get("sort") ?? "gan_moc_bao_duong") as "ma_xe" | "gan_moc_bao_duong" | "odo";
  const page = Number(params.get("page") ?? 1);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const q = params.get("q") ?? "";

  const list = useQuery({
    queryKey: [...qk.vehicles, { trang_thai, loai_xe, sort, page, q }],
    queryFn: () => vehiclesApi.list({ trang_thai, loai_xe, sort, page, page_size: PAGE_SIZE, q }),
    placeholderData: keepPreviousData,
  });
  const counts = useQuery({ queryKey: qk.dashboard, queryFn: staffApi.dashboard });

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  }
  const tabs: [TrangThaiXe | "", string, number | undefined][] = [
    ["", "Tất cả", counts.data?.tong_xe],
    ["KhaDung", "Khả dụng", counts.data?.xe_theo_trang_thai.KhaDung],
    ["DangThue", "Đang thuê", counts.data?.xe_theo_trang_thai.DangThue],
    ["CanBaoDuong", "Cần bảo dưỡng", counts.data?.xe_theo_trang_thai.CanBaoDuong],
  ];

  return (
    <StaffLayout breadcrumb={["Danh sách xe"]}>
      <PageHeading eyebrow="Đội xe" title="Danh sách xe" subtitle={`${counts.data?.tong_xe ?? "…"} xe • Theo dõi trạng thái, ODO và mốc bảo dưỡng của từng xe.`} />
      <div className="space-y-4 rounded-panel border border-line bg-white p-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">
          {tabs.map(([v, l, n]) => (
            <button key={l} role="tab" aria-selected={trang_thai === v} onClick={() => update({ trang_thai: v })}
              className={cx("flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold", trang_thai === v ? "bg-primary text-white" : "border border-line bg-subtle text-ink")}>
              {l}<span className={cx("rounded-full px-2 text-xs font-normal", trang_thai === v ? "bg-primary-soft text-primary" : "bg-white text-ink-muted")}>{n ?? "…"}</span>
            </button>
          ))}
        </div>
        <form className="grid gap-4 md:grid-cols-[1fr_200px_220px_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Tìm kiếm<input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã xe hoặc tên xe…" /></label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Loại xe
            <select className={inputClass} value={loai_xe} onChange={(e) => update({ loai_xe: e.target.value })}><option value="">Tất cả loại xe</option><option value="Manual">Manual • Xe số</option><option value="Automatic">Automatic • Xe tay ga</option></select></label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Sắp xếp
            <select className={inputClass} value={sort} onChange={(e) => update({ sort: e.target.value })}><option value="gan_moc_bao_duong">Gần mốc bảo dưỡng nhất</option><option value="ma_xe">Mã xe</option><option value="odo">ODO cao nhất</option></select></label>
          <Button type="submit" variant="secondary">Tìm</Button>
        </form>
      </div>
      <div className="overflow-hidden rounded-panel border border-line bg-white">
        {list.isLoading && <div className="p-5"><LoadingState label="Đang tải danh sách xe…" /></div>}
        {list.isError && <div className="p-5"><ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /></div>}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title="Không có xe nào khớp bộ lọc" description="Thử bỏ bớt bộ lọc." action={<Button variant="secondary" onClick={() => { setSearch(""); setParams(new URLSearchParams()); }}>Xóa bộ lọc</Button>} />
        )}
        {list.data && list.data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead><tr className="bg-subtle text-eyebrow uppercase text-ink-muted"><th className="px-5 py-3">Mã xe</th><th className="px-5 py-3">Xe</th><th className="px-5 py-3">Đơn giá / ngày</th><th className="px-5 py-3">ODO hiện tại</th><th className="px-5 py-3">Từ lần bảo dưỡng</th><th className="px-5 py-3">Trạng thái</th><th /></tr></thead>
              <tbody>
                {list.data.items.map((v) => (
                  <tr key={v.ma_xe} className={cx("border-t border-line", v.can_bao_duong && "bg-warning-bg")}>
                    <td className="px-5 py-3.5 font-semibold text-primary">{v.ma_xe}</td>
                    <td className="px-5 py-3.5"><p className="font-semibold">{v.ten_xe}</p><p className="text-xs text-ink-muted">{VEHICLE_TYPE[v.loai_xe]}</p></td>
                    <td className="px-5 py-3.5">{formatVnd(v.don_gia_ngay_vnd)}</td>
                    <td className="px-5 py-3.5">{formatKm(v.odo_hien_tai)}</td>
                    <td className="w-44 px-5 py-3.5"><ProgressBar value={v.km_tu_lan_bao_duong} max={v.nguong_km} tone={v.km_tu_lan_bao_duong >= v.nguong_km * 0.9 ? "warning" : "primary"} label={`${v.ma_xe} đã đi từ lần bảo dưỡng`} />
                      <p className={cx("mt-1.5 text-xs", v.can_bao_duong ? "text-warning" : "text-ink-muted")}>{v.km_tu_lan_bao_duong.toLocaleString("vi-VN").replace(/,/g, ".")} / {v.nguong_km.toLocaleString("vi-VN").replace(/,/g, ".")} km</p></td>
                    <td className="px-5 py-3.5"><Badge tone={VEHICLE_STATUS[v.trang_thai].tone}>{VEHICLE_STATUS[v.trang_thai].label}</Badge></td>
                    <td className="px-5 py-3.5 text-right"><Link to={`/nhan-vien/xe/${v.ma_xe}`} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-primary">Chi tiết</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <div className="border-t border-line px-4"><Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} label="xe" onPage={(p) => update({ page: String(p) })} /></div>}
      </div>
    </StaffLayout>
  );
}
