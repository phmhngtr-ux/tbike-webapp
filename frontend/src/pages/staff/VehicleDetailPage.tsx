import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { VehiclePhoto } from "../../components/Domain";
import { Alert, Badge, DetailRow, EmptyState, ErrorState, LoadingState, PageHeading, Panel, ProgressBar } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDate, formatDateTime, formatKm, formatVnd } from "../../lib/format";
import { REQUEST_STATUS, VEHICLE_STATUS, VEHICLE_TYPE } from "../../lib/status";
import { qk } from "../../services/queryKeys";
import { vehiclesApi } from "../../services/vehiclesApi";

const EVENT = { GiaoXe: "Giao xe", NhanXe: "Nhận xe", BaoDuong: "Bảo dưỡng" } as const;

/** B2 · Chi tiet xe & lich su ODO */
export function VehicleDetailPage() {
  const { maXe = "" } = useParams();
  const detail = useQuery({ queryKey: [...qk.vehicles, "detail", maXe], queryFn: () => vehiclesApi.detail(maXe) });
  const history = useQuery({ queryKey: [...qk.maintenance, "history", maXe], queryFn: () => vehiclesApi.history(maXe) });
  const v = detail.data;
  const notFound = detail.error instanceof ApiError && detail.error.status === 404;

  return (
    <StaffLayout breadcrumb={["Danh sách xe", maXe]}>
      {detail.isLoading && <LoadingState />}
      {notFound && <EmptyState title={`Không tìm thấy xe ${maXe}`} action={<Link to="/nhan-vien/xe" className="font-semibold text-primary underline">Về danh sách xe</Link>} />}
      {detail.isError && !notFound && <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />}
      {v && (
        <>
          <PageHeading eyebrow={`Đội xe / ${v.ma_xe}`} title={v.ten_xe} subtitle={VEHICLE_TYPE[v.loai_xe]}
            actions={<><Badge tone={VEHICLE_STATUS[v.trang_thai].tone}>{VEHICLE_STATUS[v.trang_thai].label}</Badge>
              {v.trang_thai !== "DangThue" && <Link to={`/nhan-vien/bao-duong?xe=${v.ma_xe}`} className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">Ghi nhận bảo dưỡng</Link>}</>} />
          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel>
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="flex h-[165px] w-full shrink-0 items-center justify-center rounded-[10px] bg-subtle sm:w-[220px]"><VehiclePhoto tenXe={v.ten_xe} className="h-full w-full p-2" /></div>
                <div className="flex-1">
                  <DetailRow label="Mã xe">{v.ma_xe}</DetailRow>
                  <DetailRow label="Loại xe">{v.loai_xe}</DetailRow>
                  <DetailRow label="Đơn giá thuê">{formatVnd(v.don_gia_ngay_vnd)}/ngày</DetailRow>
                  <DetailRow label="Đơn đang gắn">{v.don_lien_quan.find((o) => o.trang_thai_xu_ly === "DangThue")?.ma_don_thue ?? "Không có"}</DetailRow>
                  <DetailRow label="Trạng thái cho thuê">{v.trang_thai === "CanBaoDuong" ? "Tạm khóa do cần bảo dưỡng" : VEHICLE_STATUS[v.trang_thai].label}</DetailRow>
                </div>
              </div>
            </Panel>
            <Panel title="ODO & mốc bảo dưỡng">
              <DetailRow label="ODO hiện tại">{formatKm(v.odo_hien_tai)}</DetailRow>
              <DetailRow label="ODO bảo dưỡng gần nhất">{formatKm(v.odo_bao_duong_gan_nhat)}{v.ngay_bao_duong_gan_nhat ? ` • ${formatDate(v.ngay_bao_duong_gan_nhat)}` : ""}</DetailRow>
              <div className="my-3"><ProgressBar value={v.km_tu_lan_bao_duong} max={v.nguong_km} tone={v.can_bao_duong ? "warning" : "primary"} label="Đã đi từ lần bảo dưỡng" /></div>
              <DetailRow label="Đã đi từ lần bảo dưỡng" tone={v.can_bao_duong ? "warning" : undefined}>{formatKm(v.km_tu_lan_bao_duong)} / {formatKm(v.nguong_km)}</DetailRow>
              {v.can_bao_duong && <div className="mt-3"><Alert tone="warning" title={`Đã vượt ngưỡng ${formatKm(v.nguong_km)}`}>Xe bị khóa cho thuê đến khi ghi nhận bảo dưỡng hoàn tất.</Alert></div>}
            </Panel>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Lịch sử ODO" caption="Mỗi lần giao/nhận và bảo dưỡng đều được ghi lại, không chỉnh sửa sau khi đơn hoàn tất.">
              {v.lich_su_odo.length === 0 ? <p className="text-[13px] text-ink-muted">Chưa có lần giao/nhận hoặc bảo dưỡng nào.</p> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
                  <thead><tr className="bg-subtle text-eyebrow uppercase text-ink-muted"><th className="px-4 py-3">Thời điểm</th><th className="px-4 py-3">Sự kiện</th><th className="px-4 py-3">Đơn</th><th className="px-4 py-3">ODO</th><th className="px-4 py-3">Quãng đường</th><th className="px-4 py-3">Người ghi</th></tr></thead>
                  <tbody>{v.lich_su_odo.map((e, i) => (
                    <tr key={i} className={`border-t border-line ${e.su_kien === "BaoDuong" ? "bg-success-bg" : ""}`}>
                      <td className="px-4 py-3">{formatDateTime(e.thoi_diem)}</td><td className="px-4 py-3">{EVENT[e.su_kien]}</td>
                      <td className="px-4 py-3">{e.ma_don_thue ? <Link className="text-primary" to={`/nhan-vien/don/${e.ma_don_thue}`}>{e.ma_don_thue}</Link> : "—"}</td>
                      <td className="px-4 py-3 font-semibold">{formatKm(e.odo)}</td><td className="px-4 py-3">{e.quang_duong !== null ? `+${formatKm(e.quang_duong)}` : e.su_kien === "BaoDuong" ? "Đặt lại mốc theo dõi" : "—"}</td><td className="px-4 py-3">{e.nguoi_ghi ?? "—"}</td>
                    </tr>))}</tbody>
                </table></div>
              )}
            </Panel>
            <div className="space-y-6">
              <Panel title="Lịch sử bảo dưỡng">
                {history.isLoading && <LoadingState rows={2} />}
                {history.isError && <ErrorState message={errorMessage(history.error)} onRetry={() => history.refetch()} />}
                {history.data?.length === 0 && <p className="text-[13px] text-ink-muted">Chưa có lần bảo dưỡng nào được ghi nhận.</p>}
                <ul className="space-y-3">{history.data?.map((h) => (
                  <li key={h.ma_lan_bao_duong}><p className="text-sm font-semibold">{formatDate(h.ngay_bao_duong)} • ODO {formatKm(h.odo_luc_bao_duong)}</p><p className="text-xs text-ink-muted">{h.ghi_chu ?? "Không có ghi chú"} • {h.ten_nguoi_ghi_nhan}</p></li>))}</ul>
              </Panel>
              <Panel title="Lịch thuê sắp tới">
                {v.don_lien_quan.length === 0 ? <p className="text-[13px] text-ink-muted">Không có yêu cầu/đơn đang mở.</p> : (
                  <ul className="space-y-3">{v.don_lien_quan.map((o) => (
                    <li key={o.ma_yeu_cau} className="flex items-center gap-3"><div className="flex-1"><Link className="text-sm font-semibold text-primary" to={o.ma_don_thue ? `/nhan-vien/don/${o.ma_don_thue}` : `/nhan-vien/yeu-cau/${o.ma_yeu_cau}`}>{o.ma_don_thue ?? o.ma_yeu_cau}</Link>
                      <p className="text-xs text-ink-muted">{o.ho_ten_khach} • {formatDateTime(o.thoi_gian_nhan_du_kien)} → {formatDateTime(o.thoi_gian_tra_du_kien)}</p></div>
                      <Badge tone={REQUEST_STATUS[o.trang_thai_xu_ly].tone}>{REQUEST_STATUS[o.trang_thai_xu_ly].label}</Badge></li>))}</ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </StaffLayout>
  );
}
