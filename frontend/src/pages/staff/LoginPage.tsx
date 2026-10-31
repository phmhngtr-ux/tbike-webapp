import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Logo } from "../../components/StaffLayout";
import { IconCheck, IconInfo, IconLoader } from "../../components/Icons";
import { Alert, Field, inputClass } from "../../components/ui";

/** A1 · Dang nhap nhan vien (Supabase Auth) */
export function LoginPage() {
  const { status, signIn, configured, signOutReason } = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const expired = params.get("het_phien") === "1" || signOutReason === "expired" || signOutReason === "idle";
  const next = params.get("next") || "/nhan-vien";

  useEffect(() => setError(null), [email, password]);
  if (status === "ready") return <Navigate to={next.startsWith("/nhan-vien") ? next : "/nhan-vien"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError("Nhập email và mật khẩu");
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đăng nhập được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-page lg:flex-row">
      <aside className="flex flex-col justify-between gap-10 bg-sidebar p-8 text-white lg:w-[560px] lg:p-14">
        <Logo className="h-20" />
        <div className="space-y-4">
          <h1 className="text-page text-white">Vận hành cho thuê xe gọn hơn mỗi ngày</h1>
          {["Theo dõi yêu cầu, đơn thuê và lịch xe tập trung", "Ghi ODO khi giao/nhận, cảnh báo bảo dưỡng 2.000 km", "Tự động tính phụ phí trả xe trễ theo quy tắc cửa hàng"].map((t) => (
            <p key={t} className="flex items-center gap-2.5 text-sm"><IconCheck className="text-[#7FD1C7]" />{t}</p>
          ))}
        </div>
        <p className="hidden text-xs lg:block">T-Bike • 110 Trần Văn Dư, Ngũ Hành Sơn, Đà Nẵng</p>
      </aside>
      <main className="flex flex-1 items-center justify-center p-5">
        <form onSubmit={onSubmit} noValidate className="w-full max-w-[440px] space-y-5 rounded-2xl border border-line bg-white p-8 sm:p-10" aria-describedby="login-desc">
          <p className="text-eyebrow uppercase text-primary">Khu vực nhân viên</p>
          <div><h2 className="text-page text-ink">Đăng nhập</h2><p id="login-desc" className="mt-1.5 text-sm text-ink-muted">Dùng tài khoản do chủ cửa hàng cấp để quản lý đơn thuê, xe và bảo dưỡng.</p></div>
          {!configured && <Alert tone="danger" title="Chưa cấu hình Supabase">Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong frontend/.env rồi khởi động lại.</Alert>}
          {expired && !error && <Alert tone="warning" title="Phiên đăng nhập đã hết hạn">Đăng nhập lại để tiếp tục — dữ liệu đã lưu không bị mất.</Alert>}
          {error && <Alert tone="danger" title={error}>Kiểm tra lại thông tin đăng nhập.</Alert>}
          <Field label="Email" htmlFor="email"><input id="email" type="email" autoComplete="username" className={inputClass} value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Mật khẩu" htmlFor="password" error={error === "Email hoặc mật khẩu không đúng" ? "Mật khẩu không đúng." : undefined}>
            <input id="password" type="password" autoComplete="current-password" className={inputClass} value={password} disabled={busy} aria-invalid={!!error} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <p className="text-xs text-ink-muted">Quên mật khẩu? Liên hệ chủ cửa hàng để cấp lại.</p>
          <button type="submit" disabled={busy || !configured} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary-hover focus-visible:shadow-focus focus-visible:outline-none disabled:opacity-70">
            {busy && <IconLoader className="animate-spin" size={16} />}{busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
          <p className="flex items-center gap-1.5 text-xs text-ink-muted"><IconInfo size={14} />Khách thuê xe không cần tài khoản — dùng trang <a href="/tra-cuu" className="underline">Tra cứu yêu cầu</a>.</p>
        </form>
      </main>
    </div>
  );
}
