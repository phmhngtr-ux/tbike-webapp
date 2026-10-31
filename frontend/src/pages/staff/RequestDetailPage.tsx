import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StaffLayout } from "../../components/StaffLayout";
import { DeliveryLine, VehiclePhoto } from "../../components/Domain";
import { IconCheck } from "../../components/Icons";
import { Alert, Badge, Button, cx, DetailRow, EmptyState, ErrorState, Field, inputClass, LoadingState, Modal, PageHeading, Panel } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime, formatVnd } from "../../lib/format";
import { REQUEST_STATUS } from "../../lib/status";
import { invalidateOperational, qk } from "../../services/queryKeys";
import { rentalsApi } from "../../services/rentalsApi";

/** C3 · Chi tiet yeu cau & xac nhan don */
export function RequestDetailPage() {
  const { maYeuCau = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const req = useQuery({ queryKey: qk.request(maYeuCau), queryFn: () => rentalsApi.get(maYeuCau) });
  const methods = useQuery({ queryKey: qk.depositMethods, queryFn: rentalsApi.depositMethods });
  const [method, setMethod] = useState<string>("");
  const [depositStatus, setDepositStatus] = useState<"ChuaKiemTra" | "DaXacNhan">("ChuaKiemTra");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (req.data?.ma_phuong_thuc_bao_dam) setMethod(req.data.ma_phuong_thuc_bao_dam);
  }, [req.data?.ma_phuong_thuc_bao_dam]);

  const confirm = useMutation({
    mutationFn: () => rentalsApi.confirm(maYeuCau, { ma_phuong_thuc_bao_dam: method || null, trang_thai_bao_dam: method ? depositStatus : "ChuaKiemTra" }),
    onSuccess: async (res) => { setWarnings(res.canh_bao); await invalidateOperational(client); },
    onError: async (err) => { if (err instanceof ApiError && err.status === 409) await invalidateOperational(client); },
  });
  const reject = useMutation({
    mutationFn: () => rentalsApi.reject(maYeuCau, reason),
    onSuccess: async () => { setRejectOpen(false); await invalidateOperational(client); },
  });

  const r = req.data;
  const notFound = req.error instanceof ApiError && req.error.status === 404;
  const confirmErr = confirm.error instanceof ApiError ? confirm.error : null;
  const canAct = r?.trang_thai_xu_ly === "DaGui";

  return (
    <StaffLayout breadcrumb={["Yêu cầu & đơn thuê", "Chi tiết yêu cầu"]}>
      {req.isLoading && <LoadingState />}
      {notFound && <EmptyState title={`Không tìm thấy yêu cầu ${maYeuCau}`} action={<Link to="/nhan-vien/yeu-cau" className="font-semibold text-primary underline">Về danh sách</Link>} />}
      {req.isError && !notFound && <ErrorState message={errorMessage(req.error)} onRetry={() => req.refetch()} />}
      {r && (
        <>
          <PageHeading eyebrow={`Quản lý thuê xe / ${r.ma_yeu_cau}`} title="Chi tiết yêu cầu thuê xe" subtitle="Kiểm tra thông tin và lựa chọn bảo đảm trước khi xác nhận."
            actions={<Badge tone={REQUEST_STATUS[r.trang_thai_xu_ly].tone}>{REQUEST_STATUS[r.trang_thai_xu_ly].label}</Badge>} />
          {r.trang_thai_xu_ly === "DaXacNhan" && (
            <Alert tone="success" title={`Đã tạo đơn ${r.ma_don_thue}`} action={<Button onClick={() => navigate(`/nhan-vien/don/${r.ma_don_thue}/giao-xe`)}>Đi tới giao xe</Button>}>
              Đơn giá đã chốt {formatVnd(r.don_gia_ap_dung_vnd)}/ngày • Xác nhận bởi {r.ten_nguoi_xac_nhan}.
              {warnings.map((w) => <span key={w} className="mt-1 block font-semibold text-warning">{w}</span>)}
            </Alert>
          )}
          {r.trang_thai_xu_ly === "TuChoi" && <Alert tone="danger" title="Yêu cầu đã bị từ chối">{r.ly_do_tu_choi ?? "Không ghi nhận lý do."}</Alert>}
          {r.ma_don_thue && r.trang_thai_xu_ly !== "DaXacNhan" && <Alert tone="info" title={`Yêu cầu đã chuyển thành đơn ${r.ma_don_thue}`} action={<Link to={`/nhan-vien/don/${r.ma_don_thue}`} className="text-sm font-semibold text-primary underline">Xem đơn</Link>} />}
          <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
            <div className="space-y-6">
              <Panel title="Khách hàng & thời gian thuê">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><p className="text-xs text-ink-muted">Họ và tên</p><p className="text-sm font-semibold">{r.ho_ten_khach}</p></div>
                  <div><p className="text-xs text-ink-muted">Số điện thoại</p><p className="text-sm font-semibold"><a href={`tel:${r.so_dien_thoai}`}>{r.so_dien_thoai}</a></p></div>
                </div>
                <hr className="my-4 border-line" />
                <DetailRow label="Nhận xe">{formatDateTime(r.thoi_gian_nhan_du_kien)}</DetailRow>
                <DetailRow label="Trả dự kiến">{formatDateTime(r.thoi_gian_tra_du_kien)}</DetailRow>
                <DetailRow label="Nhận xe tại"><DeliveryLine order={r} /></DetailRow>
                {r.hinh_thuc_nhan_xe === "GiaoTanNoi" && <p className="mt-2 text-xs text-info">Kiểm tra phạm vi 5 km khi gọi xác nhận; ngoài phạm vi báo phí cho khách.</p>}
                {r.ghi_chu_yeu_cau && <p className="mt-3 text-xs text-ink-muted">Ghi chú: {r.ghi_chu_yeu_cau}</p>}
              </Panel>
              {canAct && (
                <Panel title="Bảo đảm thuê xe" caption="Chỉ chọn một hình thức. Bảo đảm được giữ và hoàn riêng với tiền thuê, xử lý thủ công tại quầy.">
                  {methods.isLoading && <LoadingState rows={2} />}
                  {methods.isError && <ErrorState message={errorMessage(methods.error)} onRetry={() => methods.refetch()} />}
                  <div className="space-y-3" role="radiogroup" aria-label="Hình thức bảo đảm">
                    {methods.data?.map((m) => (
                      <label key={m.ma_phuong_thuc} className={cx("flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3.5", method === m.ma_phuong_thuc ? "border-primary bg-primary-soft" : "border-line")}>
                        <input type="radio" name="bd" className="accent-primary" checked={method === m.ma_phuong_thuc} onChange={() => setMethod(m.ma_phuong_thuc)} />
                        <span className="text-sm font-semibold">{m.ten_phuong_thuc}</span>
                      </label>
                    ))}
                  </div>
                  {method && (
                    <div className="mt-5 space-y-2">
                      <p className="text-[13px] font-semibold">Trạng thái bảo đảm *</p>
                      <div className="flex rounded-[10px] border border-line bg-subtle p-1" role="radiogroup" aria-label="Trạng thái bảo đảm">
                        {([["ChuaKiemTra", "Chưa kiểm tra"], ["DaXacNhan", "Đã xác nhận"]] as const).map(([v, l]) => (
                          <button key={v} type="button" role="radio" aria-checked={depositStatus === v} onClick={() => setDepositStatus(v)}
                            className={cx("h-9 flex-1 rounded-lg text-[13px]", depositStatus === v ? "border border-primary bg-white font-semibold text-primary" : "text-ink-muted")}>{l}</button>
                        ))}
                      </div>
                      <p className="text-xs text-ink-muted">Chỉ ghi nhận Đã xác nhận sau khi đã kiểm tra thủ công. “Đã hoàn trả” được cập nhật khi hoàn tất trả xe.</p>
                    </div>
                  )}
                </Panel>
              )}
              {canAct && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link to="/nhan-vien/yeu-cau" className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-primary">Quay lại</Link>
                  <div className="flex gap-3">
                    <Button variant="danger" onClick={() => setRejectOpen(true)}>Từ chối</Button>
                    <Button icon={<IconCheck size={16} />} loading={confirm.isPending} disabled={r.co_trung_lich} onClick={() => confirm.mutate()}>Xác nhận</Button>
                  </div>
                </div>
              )}
              {canAct && <p className="text-xs text-ink-muted">Khi xác nhận: tạo đơn ORD-{r.ma_yeu_cau.slice(4)}, chốt đơn giá hiện hành và giữ lịch {r.ma_xe}. Nếu từ chối, bắt buộc nhập lý do để khách tra cứu.</p>}
            </div>
            <aside className="space-y-6">
              <Panel title={`${r.ma_xe} • ${r.ten_xe}`}>
                <div className="flex items-center justify-between"><span className="text-[13px] text-ink-muted">{r.loai_xe}</span><div className="h-20 w-28"><VehiclePhoto tenXe={r.ten_xe} className="h-full w-full" /></div></div>
                <hr className="my-3 border-line" />
                <DetailRow label="Đơn giá">{formatVnd(r.don_gia_ap_dung_vnd ?? r.don_gia_hien_hanh_vnd)}/ngày{r.don_gia_ap_dung_vnd ? " (đã chốt)" : ""}</DetailRow>
                <DetailRow label="Thời gian thuê">{r.so_ngay_thue} ngày</DetailRow>
                <DetailRow label="Tiền thuê cơ bản">{formatVnd(r.tien_thue_du_kien_vnd)}</DetailRow>
              </Panel>
              {canAct && (
                <Panel title="Kiểm tra xung đột lịch">
                  {r.co_trung_lich || confirmErr?.code === "SCHEDULE_CONFLICT" ? (
                    <Alert tone="danger" title="Có xung đột lịch • Chặn xác nhận">
                      {confirmErr?.code === "SCHEDULE_CONFLICT" ? confirmErr.message : `${r.ma_xe} đã có đơn xác nhận hoặc đang thuê trùng khoảng thời gian này.`} Cần đổi xe hoặc thời gian trước khi xác nhận.
                    </Alert>
                  ) : (
                    <Alert tone="success" title="Không xung đột • Có thể xác nhận">{r.ma_xe} không có đơn đã xác nhận hoặc đang thuê trùng khoảng {formatDateTime(r.thoi_gian_nhan_du_kien)} – {formatDateTime(r.thoi_gian_tra_du_kien)}.</Alert>
                  )}
                  <p className="mt-3 text-xs text-ink-muted">Hệ thống kiểm tra lại ngay khi bấm Xác nhận để tránh hai nhân viên giữ cùng một xe.</p>
                </Panel>
              )}
              {confirmErr && confirmErr.code !== "SCHEDULE_CONFLICT" && (
                <Alert tone={confirmErr.code === "INVALID_STATE" ? "warning" : "danger"} title={confirmErr.code === "INVALID_STATE" ? `${r.ma_yeu_cau} không còn xử lý được` : confirmErr.message}>
                  {confirmErr.code === "INVALID_STATE" ? "Yêu cầu đã được nhân viên khác xử lý. Dữ liệu đã được tải lại." : null}
                </Alert>
              )}
            </aside>
          </div>
          <Modal open={rejectOpen} title={`Từ chối ${r.ma_yeu_cau}?`} onClose={() => setRejectOpen(false)}
            footer={<><Button variant="secondary" onClick={() => setRejectOpen(false)}>Hủy</Button><Button variant="danger" loading={reject.isPending} disabled={reason.trim().length < 3} onClick={() => reject.mutate()}>Từ chối yêu cầu</Button></>}>
            <Field label="Lý do từ chối" required htmlFor="lydo" helper="Khách sẽ thấy lý do này khi tra cứu." error={reject.error ? errorMessage(reject.error) : undefined}>
              <textarea id="lydo" className={cx(inputClass, "h-24 py-2.5")} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </Modal>
        </>
      )}
    </StaffLayout>
  );
}
