import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { StaffLayout } from "../../components/StaffLayout";
import { IconLock } from "../../components/Icons";
import { Button } from "../../components/ui";

const MESSAGES: Record<string, string> = {
  STAFF_PROFILE_NOT_FOUND: "Tài khoản này chưa được cấp quyền vào khu vực vận hành. Liên hệ chủ cửa hàng để được tạo hồ sơ nhân viên.",
  STAFF_INACTIVE: "Tài khoản nhân viên đã bị khóa. Liên hệ chủ cửa hàng nếu đây là nhầm lẫn.",
  FORBIDDEN_ROLE: "Chức năng này chỉ dành cho Chủ cửa hàng. Thao tác của bạn chưa được thực hiện.",
};

/** A3 · Khong co quyen thuc hien */
export function ForbiddenPage({ code = "FORBIDDEN_ROLE", standalone }: { code?: string; standalone?: boolean }) {
  const { signOut } = useAuth();
  const body = (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-bg text-danger"><IconLock size={28} /></span>
      <p className="text-eyebrow uppercase text-ink-muted">Mã lỗi 403</p>
      <h1 className="text-lg font-semibold text-ink">Bạn không có quyền thực hiện thao tác này</h1>
      <p className="max-w-[520px] text-sm text-ink-muted">{MESSAGES[code] ?? MESSAGES.FORBIDDEN_ROLE}</p>
      <div className="flex gap-3">
        <a href="https://zalo.me/0816243243" className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-primary">Liên hệ chủ cửa hàng</a>
        {standalone ? <Button onClick={() => void signOut("manual")}>Đăng xuất</Button> : <Link to="/nhan-vien" className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white">Về trang tổng quan</Link>}
      </div>
    </div>
  );
  return standalone ? <div className="min-h-screen bg-page p-6">{body}</div> : <StaffLayout breadcrumb={["Không có quyền"]}>{body}</StaffLayout>;
}
