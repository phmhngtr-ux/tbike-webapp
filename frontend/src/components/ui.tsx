import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Tone } from "../lib/status";
import { IconAlert, IconCheckCircle, IconFilterX, IconInfo, IconLoader, IconRefresh, IconX, IconXCircle } from "./Icons";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------- Button (Figma: Button / Web Button) ----------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "ghostDark";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover disabled:bg-[#E9EDF2] disabled:text-ink-muted",
  secondary: "bg-white text-primary border border-line hover:bg-primary-soft disabled:text-ink-muted",
  ghost: "bg-transparent text-ink-muted hover:bg-subtle",
  danger: "bg-white text-danger border border-line hover:bg-danger-bg",
  inverse: "bg-white text-primary hover:bg-primary-soft",
  ghostDark: "bg-transparent text-white border border-white/70 hover:bg-white/15",
};

export function Button({
  variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <IconLoader className="animate-spin" size={16} /> : icon}
      {children}
    </button>
  );
}

// ---------- Badge (Figma: Status Badge) ----------
const BADGE: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-subtle text-ink-muted border border-line",
};
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold", BADGE[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

// ---------- Alert ----------
const ALERT: Record<Exclude<Tone, "neutral">, { box: string; icon: ReactNode }> = {
  success: { box: "bg-success-bg", icon: <IconCheckCircle className="text-success" /> },
  info: { box: "bg-info-bg", icon: <IconInfo className="text-info" /> },
  warning: { box: "bg-warning-bg", icon: <IconAlert className="text-warning" /> },
  danger: { box: "bg-danger-bg", icon: <IconXCircle className="text-danger" /> },
};
const ALERT_TITLE: Record<Exclude<Tone, "neutral">, string> = { success: "text-success", info: "text-info", warning: "text-warning", danger: "text-danger" };

export function Alert({ tone, title, children, action }: { tone: Exclude<Tone, "neutral">; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-[10px] px-4 py-3.5", ALERT[tone].box)}>
      <span className="mt-0.5 shrink-0">{ALERT[tone].icon}</span>
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-semibold", ALERT_TITLE[tone])}>{title}</p>
        {children && <div className="mt-1 text-[13px] leading-relaxed text-ink">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

// ---------- Panel ----------
export function Panel({ title, caption, actions, children, className }: { title?: string; caption?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-panel border border-line bg-white p-6", className)}>
      {(title || actions) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
            {caption && <p className="mt-1 text-[13px] text-ink-muted">{caption}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeading({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow uppercase text-ink-muted">{eyebrow}</p>}
        <h1 className="mt-1.5 text-page text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function DetailRow({ label, children, tone }: { label: string; children: ReactNode; tone?: "warning" | "danger" | "success" }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className={cx("text-right text-sm font-semibold", tone === "warning" && "text-warning", tone === "danger" && "text-danger", tone === "success" && "text-success", !tone && "text-ink")}>
        {children}
      </span>
    </div>
  );
}

// ---------- Form field (Figma: Form Field Default/Focus/Error/Read-only/Disabled) ----------
export const inputClass =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-subtle disabled:text-ink-muted aria-[invalid=true]:border-danger read-only:bg-subtle read-only:text-ink-muted";

export function Field({ label, htmlFor, error, helper, children, required }: { label: string; htmlFor: string; error?: string; helper?: ReactNode; children: ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger">{error}</p>
      ) : helper ? (
        <p className="text-xs text-ink-muted">{helper}</p>
      ) : null}
    </div>
  );
}

// ---------- States ----------
export function LoadingState({ label = "Đang tải dữ liệu…", rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3 py-2" role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-14 animate-pulse rounded-md bg-line" />
          <div className="h-3 w-40 animate-pulse rounded-md bg-line" />
          <div className="h-3 w-20 animate-pulse rounded-md bg-line" />
        </div>
      ))}
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="text-ink-muted">{icon ?? <IconFilterX size={32} />}</span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-md text-[13px] text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="py-4">
      <Alert tone="danger" title="Không tải được dữ liệu" action={onRetry && <Button variant="secondary" size="sm" icon={<IconRefresh size={14} />} onClick={onRetry}>Thử lại</Button>}>
        {message}
      </Alert>
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ open, title, children, onClose, footer }: { open: boolean; title: string; children: ReactNode; onClose: () => void; footer: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1A1A]/55 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title" className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-subtle focus-visible:shadow-focus" aria-label="Đóng"><IconX /></button>
        </div>
        <div className="text-sm text-ink">{children}</div>
        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">{footer}</div>
      </div>
    </div>
  );
}

// ---------- Pagination ----------
export function Pagination({ page, pageSize, total, onPage, label }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; label: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-xs text-ink-muted">
      <span>Hiển thị {from}–{to} / {total} {label}</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Trang trước">‹</Button>
        <span className="font-semibold text-primary">Trang {page} / {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Trang sau">›</Button>
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, tone = "primary", label }: { value: number; max: number; tone?: "primary" | "warning"; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-line" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={cx("h-1.5 rounded-full", tone === "warning" ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-panel border border-line bg-white", className)}>{children}</div>;
}

export { cx };
