import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { IconMenu, IconX } from "./Icons";
import { Logo } from "./StaffLayout";
import { cx } from "./ui";

const LINKS = [
  { to: "/", label: "Trang chủ" },
  { to: "/thue-xe", label: "Xe cho thuê" },
  { to: "/#quy-trinh", label: "Quy trình thuê xe" },
  { to: "/#kham-pha", label: "Khám phá Đà Nẵng" },
  { to: "/#lien-he", label: "Liên hệ" },
  { to: "/tra-cuu", label: "Tra cứu yêu cầu" },
];

export function PublicLayout({ children, stickyCta = true }: { children: ReactNode; stickyCta?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-3 lg:px-[120px]">
          <Link to="/" aria-label="T-Bike - Trang chủ"><Logo className="h-12" /></Link>
          <nav aria-label="Menu chính" className="hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end className={({ isActive }) => cx("text-sm", isActive && !l.to.includes("#") ? "font-semibold text-primary" : "text-ink hover:text-primary")}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-lg border border-line px-2.5 py-1.5 text-sm lg:inline" title="Bản tiếng Anh sẽ có ở giai đoạn sau">
              <b className="text-primary">VI</b> <span className="text-ink-muted">/ EN</span>
            </span>
            <Link to="/thue-xe" className="hidden h-11 items-center rounded-[10px] bg-primary px-6 text-[15px] font-semibold text-white hover:bg-primary-hover focus-visible:shadow-focus sm:inline-flex">Thuê xe ngay</Link>
            <button className="rounded p-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Mở menu">{open ? <IconX size={26} /> : <IconMenu size={26} />}</button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-line px-5 py-3 lg:hidden" aria-label="Menu di động">
            {LINKS.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block py-2.5 text-[15px] text-ink">{l.label}</Link>)}
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer id="lien-he" className="bg-sidebar text-white">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-[120px] lg:py-16">
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-white/80">Dịch vụ cho thuê xe máy tại Đà Nẵng cho khách du lịch và người dân địa phương.</p>
          </div>
          <div className="space-y-3 text-[13px] text-white/75">
            <p className="text-sm font-semibold text-white">Liên hệ</p>
            <p>110 Trần Văn Dư, phường Mỹ An, Ngũ Hành Sơn, Đà Nẵng</p>
            <p>Zalo: <a className="underline" href="https://zalo.me/0816243243">081 624 3243</a></p>
            <p><a className="underline" href="mailto:tbikedn@gmail.com">tbikedn@gmail.com</a></p>
            <p><a className="underline" href="https://www.facebook.com/share/1HiiVdvkZu/" target="_blank" rel="noreferrer">Facebook: T-Bike Đà Nẵng</a></p>
          </div>
          <div className="space-y-3 text-[13px] text-white/75">
            <p className="text-sm font-semibold text-white">Liên kết nhanh</p>
            <p><Link to="/thue-xe">Xe cho thuê</Link></p>
            <p><a href="/#quy-trinh">Quy trình thuê xe</a></p>
            <p><a href="/#kham-pha">Khám phá Đà Nẵng</a></p>
            <p><Link to="/tra-cuu">Tra cứu yêu cầu</Link></p>
          </div>
          <div className="space-y-3 text-[13px] text-white/75">
            <p className="text-sm font-semibold text-white">Giờ mở cửa</p>
            <p>[Placeholder — chờ cửa hàng xác nhận]</p>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1440px] justify-between border-t border-white/15 px-5 py-6 text-xs text-white/60 lg:px-[120px]">
          <span>© 2026 T-Bike Đà Nẵng. Bảo lưu mọi quyền.</span>
          <span>Tiếng Việt / English</span>
        </div>
      </footer>
      {stickyCta && (
        <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-line bg-white px-5 py-3 sm:hidden">
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Từ 120.000đ/ngày</p>
            <p className="text-xs text-ink-muted">Giao xe miễn phí ≤ 5 km</p>
          </div>
          <Link to="/thue-xe" className="inline-flex h-11 items-center rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-white">Thuê xe ngay</Link>
        </div>
      )}
    </div>
  );
}
