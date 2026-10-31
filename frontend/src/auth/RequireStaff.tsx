import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { VaiTro } from "../lib/types";
import { ForbiddenPage } from "../pages/staff/ForbiddenPage";
import { useAuth } from "./AuthProvider";
import { Button } from "../components/ui";

export function RequireStaff({ roles }: { roles?: VaiTro[] }) {
  const { status, profile, forbiddenCode, signOutReason, errorMessage, retry } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-sm text-ink-muted" role="status">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }
  if (status === "signedOut") {
    const params = new URLSearchParams({ next: location.pathname + location.search });
    if (signOutReason === "expired" || signOutReason === "idle") params.set("het_phien", "1");
    return <Navigate to={`/nhan-vien/dang-nhap?${params}`} replace />;
  }
  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page p-6 text-center">
        <p className="text-sm text-ink">{errorMessage}</p>
        <Button onClick={retry}>Thử lại</Button>
      </div>
    );
  }
  if (status === "forbidden") return <ForbiddenPage code={forbiddenCode ?? "FORBIDDEN"} standalone />;
  if (roles && profile && !roles.includes(profile.vai_tro)) return <ForbiddenPage code="FORBIDDEN_ROLE" />;
  return <Outlet />;
}
