import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { IconBike, IconClock, IconCoins, IconInbox, IconRefresh, IconWrench } from "../../components/Icons";
import { Badge, Button, cx, EmptyState, ErrorState, LoadingState, PageHeading, Panel } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { formatDateTime, formatDuration, formatKm, formatShortDateTime, formatTime, formatVnd } from "../../lib/format";
import { REQUEST_STATUS } from "../../lib/status";
import { qk } from "../../services/queryKeys";
import { staffApi } from "../../services/staffApi";

function Kpi({ label, value, ctx, icon, tone }: { label: string; value: number; ctx: string; icon: ReactNode; tone?: "warning" | "danger" }) {
  return (
    <div className="rounded-panel border border-line bg-white p-5">
      <div className="flex items-center justify-between text-[13px] text-ink-muted">{label}{icon}</div>
      <p className={cx("mt-2 text-kpi", tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-ink")}>{value}</p>
      <p className="mt-2 text-xs text-ink-muted">{ctx}</p>
    </div>
  );
}

/** A2 · Tong quan van hanh - moi so lieu tu GET /api/dashboard/summary */
export function DashboardPage() {
  const q = useQuery({ queryKey: qk.dashboard, queryFn: staffApi.dashboard, refetchInterval: 60_000 });
  const s = q.data;
  const total = s?.tong_xe || 0;
  return (
    <StaffLayout breadcrumb={["Tổng quan"]}>
      <PageHeading eyebrow={s ? `T-Bike Đà Nẵng • ${formatDateTime(s.cap_nhat_luc)}` : "T-Bike Đà Nẵng"} title="Tổng quan vận hành"
        subtitle="Số liệu lấy trực tiếp từ đơn thuê và đội xe trên hệ thống — không có số liệu ước tính."
        actions={<Button variant="secondary" icon={<IconRefresh size={16} />} loading={q.isFetching} onClick={() => q.refetch()}>Làm mới</Button>} />
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {s && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label="Xe khả dụng" value={s.xe_theo_trang_thai.KhaDung} ctx={`trên tổng ${s.tong_xe} xe`} icon={<IconBike className="text-success" />} />
            <Kpi label="Đang thuê" value={s.don_dang_thue} ctx={s.don_qua_han_tra ? `${s.don_qua_han_tra} đơn quá hạn trả` : `${s.don_da_xac_nhan} đơn chờ giao`} icon={<IconClock className="text-info" />} tone={s.don_qua_han_tra ? "danger" : undefined} />
            <Kpi label="Cần bảo dưỡng" value={s.xe_can_bao_duong} ctx="Đạt ngưỡng 2.000 km" icon={<IconWrench className="text-warning" />} tone={s.xe_can_bao_duong ? "warning" : undefined} />
            <Kpi label="Yêu cầu chờ xử lý" value={s.yeu_cau_cho_xu_ly} ctx={s.yeu_cau_trung_lich ? `${s.yeu_cau_trung_lich} yêu cầu trùng lịch` : "Không có yêu cầu trùng lịch"} icon={<IconInbox className="text-info" />} />
            <Kpi label="Đơn chờ đóng" value={s.don_cho_dong} ctx={`${s.don_tra_tre.length} đơn có phụ phí trễ`} icon={<IconCoins className="text-danger" />} tone={s.don_tra_tre.length ? "danger" : undefined} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <Panel title="Giao / nhận xe hôm nay" caption="Sắp xếp theo giờ hẹn. Đơn quá hạn được đưa lên đầu." actions={<Link to="/nhan-vien/yeu-cau" className="text-[13px] font-semibold text-primary">Xem tất cả</Link>}>
              {s.viec_hom_nay.length === 0 ? <EmptyState title="Không có lịch giao/nhận hôm nay" icon={<IconClock size={28} />} /> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
                  <thead><tr className="bg-subtle text-eyebrow uppercase text-ink-muted"><th className="px-4 py-3">Giờ</th><th className="px-4 py-3">Việc</th><th className="px-4 py-3">Đơn • Khách</th><th className="px-4 py-3">Xe</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr></thead>
                  <tbody>{s.viec_hom_nay.map((t) => (
                    <tr key={t.ma_yeu_cau + t.loai} className={cx("border-t border-line", t.qua_han && "bg-warning-bg")}>
                      <td className={cx("px-4 py-3.5 font-semibold", t.qua_han && "text-danger")}>{formatTime(t.thoi_diem)}</td>
                      <td className="px-4 py-3.5 font-semibold">{t.loai === "GiaoXe" ? "Giao xe" : "Nhận xe"}</td>
                      <td className="px-4 py-3.5"><p className="font-semibold">{t.ma_don_thue ?? t.ma_yeu_cau}</p><p className="text-xs text-ink-muted">{t.ho_ten_khach}</p></td>
                      <td className="px-4 py-3.5"><p className="font-semibold">{t.ma_xe}</p><p className="text-xs text-ink-muted">{t.ten_xe}</p></td>
                      <td className="px-4 py-3.5">{t.qua_han ? <Badge tone="warning">Quá hạn {formatShortDateTime(t.thoi_diem)}</Badge> : <Badge tone={REQUEST_STATUS[t.trang_thai_xu_ly].tone}>{REQUEST_STATUS[t.trang_thai_xu_ly].label}</Badge>}</td>
                      <td className="px-4 py-3.5 text-right">{t.ma_don_thue && <Link className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-primary" to={`/nhan-vien/don/${t.ma_don_thue}/${t.loai === "GiaoXe" ? "giao-xe" : "nhan-xe"}`}>{t.loai === "GiaoXe" ? "Giao xe" : "Nhận xe"}</Link>}</td>
                    </tr>))}</tbody>
                </table></div>
              )}
            </Panel>
            <div className="space-y-6">
              <Panel title="Đội xe theo trạng thái" caption={`Tổng ${total} xe`}>
                <div className="flex h-3 overflow-hidden rounded-md bg-line" aria-hidden="true">
                  {(["KhaDung", "DangThue", "CanBaoDuong"] as const).map((k) => (
                    <div key={k} className={k === "KhaDung" ? "bg-success" : k === "DangThue" ? "bg-info" : "bg-warning"} style={{ width: `${total ? (s.xe_theo_trang_thai[k] / total) * 100 : 0}%` }} />
                  ))}
                </div>
                <ul className="mt-4 space-y-3 text-[13px]">
                  {([["KhaDung", "Khả dụng", "bg-success"], ["DangThue", "Đang thuê", "bg-info"], ["CanBaoDuong", "Cần bảo dưỡng", "bg-warning"]] as const).map(([k, l, c]) => (
                    <li key={k} className="flex items-center gap-2.5"><span className={cx("h-2.5 w-2.5 rounded-full", c)} /><span className="flex-1">{l}</span><b>{s.xe_theo_trang_thai[k]} xe • {total ? Math.round((s.xe_theo_trang_thai[k] / total) * 100) : 0}%</b></li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Xe cần bảo dưỡng" caption="Đã chạy ≥ 2.000 km từ lần bảo dưỡng gần nhất">
                {s.xe_can_bao_duong_top.length === 0 ? <p className="text-[13px] text-success">Tất cả xe đều dưới ngưỡng 2.000 km.</p> : (
                  <ul className="space-y-3">{s.xe_can_bao_duong_top.map((v) => (
                    <li key={v.ma_xe} className="flex items-center gap-3"><div className="flex-1"><p className="text-sm font-semibold">{v.ma_xe} • {v.ten_xe}</p><p className="text-xs text-warning">Từ lần bảo dưỡng: {formatKm(v.km_tu_lan_bao_duong)}</p></div>
                      <Link to={`/nhan-vien/bao-duong?xe=${v.ma_xe}`} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-primary">Ghi nhận</Link></li>))}</ul>
                )}
                <Link to="/nhan-vien/bao-duong" className="mt-4 flex h-11 items-center justify-center rounded-lg border border-line text-sm font-semibold text-primary">Xem tất cả {s.xe_can_bao_duong} xe</Link>
              </Panel>
            </div>
          </div>
          <Panel title="Đơn trả trễ cần thu phụ phí" caption="Phụ phí do hệ thống tính theo quy tắc: trễ < 1 giờ = 0đ • 1–8 giờ = ½ ngày • > 8 giờ = 1 ngày.">
            {s.don_tra_tre.length === 0 ? <p className="text-[13px] text-ink-muted">Không có đơn trả trễ chờ đóng.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
                <thead><tr className="bg-subtle text-eyebrow uppercase text-ink-muted"><th className="px-4 py-3">Đơn</th><th className="px-4 py-3">Xe</th><th className="px-4 py-3">Trả dự kiến → thực tế</th><th className="px-4 py-3">Trễ</th><th className="px-4 py-3">Mức áp dụng</th><th className="px-4 py-3">Phụ phí</th><th /></tr></thead>
                <tbody>{s.don_tra_tre.map((o) => (
                  <tr key={o.ma_don_thue} className="border-t border-line">
                    <td className="px-4 py-3.5 font-semibold">{o.ma_don_thue}</td>
                    <td className="px-4 py-3.5"><p className="font-semibold">{o.ma_xe}</p><p className="text-xs text-ink-muted">{o.ten_xe} • {o.loai_xe}</p></td>
                    <td className="px-4 py-3.5">{formatShortDateTime(o.thoi_gian_tra_du_kien)} → {formatShortDateTime(o.thoi_gian_tra_thuc_te)}</td>
                    <td className={cx("px-4 py-3.5 font-semibold", o.he_so_phi_tre_ap_dung >= 1 ? "text-danger" : "text-warning")}>{formatDuration(Math.round(o.so_gio_tre * 60))}</td>
                    <td className="px-4 py-3.5">{o.he_so_phi_tre_ap_dung >= 1 ? "1 ngày" : "½ ngày"}</td>
                    <td className="px-4 py-3.5 font-semibold">{formatVnd(o.phu_phi_tre_han_vnd)}</td>
                    <td className="px-4 py-3.5 text-right"><Link to={`/nhan-vien/don/${o.ma_don_thue}/hoan-tat`} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-primary">Hoàn tất trả</Link></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </Panel>
          <Panel title="Hoạt động gần đây">
            <ul className="divide-y divide-line">{s.hoat_dong_gan_day.map((a) => (
              <li key={a.ma_yeu_cau} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                <span className="w-28 text-ink-muted">{formatShortDateTime(a.ngay_cap_nhat)}</span>
                <Link to={a.ma_don_thue ? `/nhan-vien/don/${a.ma_don_thue}` : `/nhan-vien/yeu-cau/${a.ma_yeu_cau}`} className="font-semibold text-primary">{a.ma_don_thue ?? a.ma_yeu_cau}</Link>
                <span className="flex-1">{a.ho_ten_khach} • {a.ma_xe}</span>
                <Badge tone={REQUEST_STATUS[a.trang_thai_xu_ly].tone}>{REQUEST_STATUS[a.trang_thai_xu_ly].label}</Badge>
              </li>))}</ul>
          </Panel>
        </>
      )}
    </StaffLayout>
  );
}
