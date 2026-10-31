import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { IconAlert, IconRefresh } from "../../components/Icons";
import { Alert, Badge, Button, cx, EmptyState, ErrorState, inputClass, LoadingState, PageHeading, Pagination } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { formatDateTime, formatVnd } from "../../lib/format";
import { DEPOSIT_STATUS, REQUEST_STATUS } from "../../lib/status";
import type { RentalRequest, TrangThaiXuLy } from "../../lib/types";
import { qk } from "../../services/queryKeys";
import { rentalsApi } from "../../services/rentalsApi";

const PAGE_SIZE = 15;
const TABS: [string, string, TrangThaiXuLy[]][] = [
  ["dang-xu-ly", "Đang xử lý", ["DaGui", "DaXacNhan", "DangThue"]],
  ["cho-xu-ly", "Chờ xử lý", ["DaGui"]],
  ["da-xac-nhan", "Đã xác nhận", ["DaXacNhan"]],
  ["dang-thue", "Đang thuê", ["DangThue"]],
  ["hoan-tat", "Hoàn tất", ["HoanTat"]],
  ["tu-choi", "Từ chối", ["TuChoi"]],
];

function action(r: RentalRequest): { to: string; label: string } {
  if (r.trang_thai_xu_ly === "DaGui") return { to: `/nhan-vien/yeu-cau/${r.ma_yeu_cau}`, label: r.co_trung_lich ? "Xử lý" : "Xem" };
  if (r.trang_thai_xu_ly === "DaXacNhan") return { to: `/nhan-vien/don/${r.ma_don_thue}/giao-xe`, label: "Giao xe" };
  if (r.trang_thai_xu_ly === "DangThue") return r.thoi_gian_tra_thuc_te
    ? { to: `/nhan-vien/don/${r.ma_don_thue}/hoan-tat`, label: "Hoàn tất" }
    : { to: `/nhan-vien/don/${r.ma_don_thue}/nhan-xe`, label: "Nhận xe" };
  return { to: r.ma_don_thue ? `/nhan-vien/don/${r.ma_don_thue}` : `/nhan-vien/yeu-cau/${r.ma_yeu_cau}`, label: "Xem" };
}

/** C2 · Danh sach yeu cau & don thue */
export function RequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t[0] === params.get("tab")) ?? TABS[0];
  const page = Number(params.get("page") ?? 1);
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  const list = useQuery({
    queryKey: [...qk.requests, tab[0], q, page],
    queryFn: () => rentalsApi.list({ trang_thai: tab[2], q, page, page_size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const conflicts = list.data?.items.filter((r) => r.co_trung_lich) ?? [];
  const set = (patch: Record<string, string>) => {
    const n = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (!("page" in patch)) n.delete("page");
    setParams(n);
  };

  return (
    <StaffLayout breadcrumb={["Yêu cầu & đơn thuê"]}>
      <PageHeading eyebrow="T-Bike Đà Nẵng" title="Yêu cầu & đơn thuê" subtitle="Tiếp nhận yêu cầu, kiểm tra lịch và theo dõi giao nhận xe."
        actions={<Button variant="secondary" icon={<IconRefresh size={16} />} loading={list.isFetching} onClick={() => list.refetch()}>Làm mới</Button>} />
      {conflicts.length > 0 && (
        <Alert tone="warning" title={`Cảnh báo trùng lịch • ${conflicts.length} yêu cầu`}>
          {conflicts.slice(0, 3).map((c) => `${c.ma_yeu_cau} (${c.ma_xe})`).join(", ")} trùng với đơn đã xác nhận. Cần đổi xe/thời gian hoặc từ chối trước khi xác nhận.
        </Alert>
      )}
      <div className="overflow-hidden rounded-panel border border-line bg-white">
        <div className="space-y-4 border-b border-line p-5">
          <div className="flex flex-wrap gap-2" role="tablist">
            {TABS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab[0] === key} onClick={() => set({ tab: key })}
                className={cx("rounded-full px-3.5 py-2 text-[13px] font-semibold", tab[0] === key ? "bg-primary text-white" : "border border-line bg-subtle text-ink")}>{label}</button>
            ))}
          </div>
          <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); set({ q: search.trim() }); }}>
            <input aria-label="Tìm kiếm" className={inputClass} placeholder="Mã yêu cầu, mã đơn, khách hàng, SĐT hoặc mã xe" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" variant="secondary">Tìm</Button>
          </form>
        </div>
        {list.isLoading && <div className="p-5"><LoadingState /></div>}
        {list.isError && <div className="p-5"><ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /></div>}
        {list.data?.items.length === 0 && <EmptyState title="Không có yêu cầu nào" description={q ? "Không có kết quả khớp từ khóa tìm kiếm." : "Yêu cầu mới từ khách sẽ hiện ở đây."} />}
        {!!list.data?.items.length && (
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
            <thead><tr className="bg-subtle text-eyebrow uppercase text-ink-muted"><th className="px-5 py-3">Mã yêu cầu/đơn</th><th className="px-5 py-3">Khách hàng</th><th className="px-5 py-3">Xe</th><th className="px-5 py-3">Nhận → Trả dự kiến</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Bảo đảm</th><th className="px-5 py-3">Tiền thuê</th><th /></tr></thead>
            <tbody>{list.data.items.map((r) => {
              const a = action(r);
              return (
                <tr key={r.ma_yeu_cau} className={cx("border-t border-line", r.co_trung_lich && "bg-warning-bg")}>
                  <td className="px-5 py-3.5"><p className="font-semibold text-primary">{r.ma_don_thue ?? r.ma_yeu_cau}</p>{r.hinh_thuc_nhan_xe === "GiaoTanNoi" && <p className="text-xs text-info">Giao tận nơi</p>}</td>
                  <td className="px-5 py-3.5"><p className="font-semibold">{r.ho_ten_khach}</p><p className="text-xs text-ink-muted">{r.so_dien_thoai}</p></td>
                  <td className="px-5 py-3.5"><p className="font-semibold">{r.ma_xe}</p><p className="text-xs text-ink-muted">{r.ten_xe}</p></td>
                  <td className="px-5 py-3.5 text-[13px]">{formatDateTime(r.thoi_gian_nhan_du_kien)}<br />→ {formatDateTime(r.thoi_gian_tra_du_kien)}</td>
                  <td className="px-5 py-3.5"><Badge tone={REQUEST_STATUS[r.trang_thai_xu_ly].tone}>{REQUEST_STATUS[r.trang_thai_xu_ly].label}</Badge></td>
                  <td className="px-5 py-3.5 text-[13px]">{r.ten_phuong_thuc_bao_dam ?? <span className="text-ink-muted">Chưa chọn</span>}<br /><span className="text-xs text-ink-muted">{DEPOSIT_STATUS[r.trang_thai_bao_dam].label}</span>
                    {r.co_trung_lich && <p className="flex items-center gap-1 text-xs font-semibold text-warning"><IconAlert size={12} />Trùng lịch {r.ma_xe}</p>}</td>
                  <td className="px-5 py-3.5">{formatVnd(r.tien_thue_du_kien_vnd)}</td>
                  <td className="px-5 py-3.5 text-right"><Link to={a.to} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-primary">{a.label}</Link></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
        {list.data && <div className="border-t border-line px-4"><Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} label="yêu cầu và đơn" onPage={(p) => set({ page: String(p) })} /></div>}
      </div>
    </StaffLayout>
  );
}
