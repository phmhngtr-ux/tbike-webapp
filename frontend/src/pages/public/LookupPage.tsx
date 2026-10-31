import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { PublicLayout } from "../../components/PublicLayout";
import { ProgressSteps } from "../../components/Domain";
import { Alert, Badge, Button, DetailRow, Field, inputClass, Panel } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { DELIVERY, REQUEST_STATUS } from "../../lib/status";
import { publicApi } from "../../services/publicApi";

const STEP_TEXT = {
  DaGui: "Cửa hàng đang kiểm tra lịch xe và sẽ gọi cho bạn.",
  DaXacNhan: "Đơn đã được xác nhận. Mang CCCD gốc hoặc tiền cọc khi nhận xe.",
  DangThue: "Bạn đang sử dụng xe. Trả xe đúng giờ để không phát sinh phụ phí.",
  HoanTat: "Đơn đã hoàn tất. Cảm ơn bạn đã thuê xe cùng T-Bike.",
  TuChoi: "Yêu cầu không được xác nhận.",
} as const;

/** C4b · Khach – Tra cuu trang thai yeu cau (can ca ma yeu cau va so dien thoai) */
export function LookupPage() {
  const [params] = useSearchParams();
  const [ma, setMa] = useState(params.get("ma") ?? "");
  const [sdt, setSdt] = useState("");
  const lookup = useMutation({ mutationFn: () => publicApi.lookup({ ma_yeu_cau: ma.trim(), so_dien_thoai: sdt }) });
  const err = lookup.error instanceof ApiError ? lookup.error : null;
  const r = lookup.data;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (ma.trim() && sdt.trim()) lookup.mutate();
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-[1280px] space-y-6 px-5 py-8 lg:py-10">
        <div>
          <p className="text-eyebrow uppercase text-ink-muted">Tra cứu yêu cầu</p>
          <h1 className="mt-1.5 text-page text-ink">Theo dõi yêu cầu thuê xe</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Nhập mã yêu cầu và số điện thoại đã dùng khi gửi để xem trạng thái.</p>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 rounded-panel border border-line bg-white p-6 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Mã yêu cầu" required htmlFor="ma"><input id="ma" className={inputClass} value={ma} onChange={(e) => setMa(e.target.value.toUpperCase())} placeholder="REQ-XXXXXXXX" maxLength={12} /></Field>
          <Field label="Số điện thoại" required htmlFor="sdt"><input id="sdt" inputMode="tel" className={inputClass} value={sdt} onChange={(e) => setSdt(e.target.value)} /></Field>
          <Button type="submit" loading={lookup.isPending}>Tra cứu</Button>
        </form>
        {err && (
          <Alert tone={err.status === 404 ? "warning" : "danger"} title={err.status === 404 ? "Không tìm thấy yêu cầu" : err.message}>
            {err.status === 404 ? "Kiểm tra lại mã yêu cầu và số điện thoại. Cần nhập đúng cả hai thông tin." : err.status === 429 ? "Vui lòng đợi ít phút rồi thử lại." : null}
          </Alert>
        )}
        {r && (
          <>
            <Panel title={r.ma_yeu_cau} caption={r.ma_don_thue ? `Mã đơn thuê ${r.ma_don_thue}` : "Yêu cầu đã gửi — chưa phải đơn thuê đã xác nhận"} actions={<Badge tone={REQUEST_STATUS[r.trang_thai_xu_ly].tone}>{REQUEST_STATUS[r.trang_thai_xu_ly].label}</Badge>}>
              <div className="grid gap-x-12 md:grid-cols-2">
                <div><DetailRow label="Khách hàng">{r.ho_ten_khach}</DetailRow><DetailRow label="Xe">{r.ten_xe} • {r.loai_xe}</DetailRow><DetailRow label="Hình thức nhận xe">{DELIVERY[r.hinh_thuc_nhan_xe]}</DetailRow></div>
                <div><DetailRow label="Nhận xe dự kiến">{formatDateTime(r.thoi_gian_nhan_du_kien)}</DetailRow><DetailRow label="Trả xe dự kiến">{formatDateTime(r.thoi_gian_tra_du_kien)}</DetailRow><DetailRow label="Ngày gửi">{formatDateTime(r.ngay_tao)}</DetailRow></div>
              </div>
            </Panel>
            <Panel title="Tiến trình xử lý" caption={STEP_TEXT[r.trang_thai_xu_ly]}>
              {r.trang_thai_xu_ly === "TuChoi"
                ? <Alert tone="danger" title="Yêu cầu bị từ chối">{r.ly_do_tu_choi ?? "Cửa hàng không thể nhận yêu cầu này."} Bạn có thể gửi yêu cầu mới với xe hoặc thời gian khác.</Alert>
                : <ProgressSteps status={r.trang_thai_xu_ly} />}
            </Panel>
            {r.trang_thai_xu_ly === "DaGui" && <Alert tone="info" title="Đang chờ cửa hàng xác nhận">Cửa hàng kiểm tra lịch xe và sẽ liên hệ qua số điện thoại đã đăng ký. Hỗ trợ Zalo: 081 624 3243.</Alert>}
          </>
        )}
      </div>
    </PublicLayout>
  );
}
