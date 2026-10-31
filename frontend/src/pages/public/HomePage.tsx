import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "../../components/PublicLayout";
import { VehiclePhoto } from "../../components/Domain";
import { IconBike, IconKey, IconMapPin, IconRotate, IconSearch, IconSend, IconShield, IconTag } from "../../components/Icons";
import { Badge, Button, ErrorState, Field, inputClass, LoadingState } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { formatVnd, nowLocalInput } from "../../lib/format";
import { VEHICLE_TYPE } from "../../lib/status";
import { publicApi } from "../../services/publicApi";

const BENEFITS = [
  { icon: IconTag, title: "Giá thuê minh bạch", text: "Giá theo ngày theo loại xe: xe số 120.000đ, xe tay ga 150.000đ. Phụ phí trả trễ tính theo quy định công khai." },
  { icon: IconBike, title: "Đa dạng lựa chọn xe", text: "Đội 250 xe số và tay ga phổ biến như Vision, Air Blade, Lead, Sirius, Janus." },
  { icon: IconShield, title: "An tâm trên hành trình", text: "Mỗi xe được theo dõi số km và bảo dưỡng định kỳ sau mỗi 2.000 km." },
  { icon: IconMapPin, title: "Thuận tiện nhận và trả xe", text: "Nhận xe tại cửa hàng hoặc giao tận nơi miễn phí trong bán kính 5 km." },
];
const STEPS = [
  { icon: IconSearch, title: "Chọn xe", text: "Chọn ngày nhận, ngày trả và chiếc xe còn trống trong thời gian đó." },
  { icon: IconSend, title: "Gửi yêu cầu đặt xe", text: "Điền họ tên, số điện thoại. Bạn nhận mã yêu cầu để tra cứu trạng thái." },
  { icon: IconKey, title: "Xác nhận và nhận xe", text: "Cửa hàng gọi xác nhận. Khi nhận xe, xuất trình CCCD gốc hoặc đặt cọc 1.000.000đ." },
  { icon: IconRotate, title: "Sử dụng và trả xe", text: "Trả xe đúng giờ hẹn. Trễ dưới 1 giờ không tính phụ phí." },
];
const PLACES = [
  { img: "/images/my-khe.jpg", name: "Biển Mỹ Khê", text: "Bãi biển dài ngay trung tâm thành phố, lý tưởng để tắm biển và ngắm bình minh." },
  { img: "/images/son-tra.jpg", name: "Bán đảo Sơn Trà", text: "Cung đường ven biển uốn lượn giữa rừng xanh, nhìn ra toàn cảnh vịnh Đà Nẵng." },
  { img: "/images/hai-van.jpg", name: "Đèo Hải Vân", text: "Con đèo ven biển nối Đà Nẵng và Huế, nổi tiếng với những khúc cua và tầm nhìn rộng." },
];

function SectionHead({ eyebrow, title, sub, center }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-eyebrow uppercase text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-ink lg:text-h2">{title}</h2>
      {sub && <p className="mt-3 text-base text-ink-muted lg:text-lg">{sub}</p>}
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [tu, setTu] = useState(nowLocalInput(24 * 60).slice(0, 11) + "08:00");
  const [den, setDen] = useState(nowLocalInput(48 * 60).slice(0, 11) + "08:00");
  const [giao, setGiao] = useState("TaiCuaHang");
  const [error, setError] = useState("");
  const vehicles = useQuery({ queryKey: ["public-vehicles-home"], queryFn: () => publicApi.vehicles({}) });

  function search(e: FormEvent) {
    e.preventDefault();
    if (!tu || !den || den <= tu) return setError("Thời gian trả phải sau thời gian nhận xe");
    navigate(`/thue-xe?${new URLSearchParams({ tu, den, giao })}`);
  }

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-[#06201E]">
        <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05201Ed9] via-[#05201E8c] to-[#05201E4d] lg:bg-gradient-to-r lg:from-[#05201Ed1] lg:via-[#05201E59] lg:to-transparent" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-10 px-5 pb-8 pt-10 lg:min-h-[720px] lg:justify-between lg:px-[120px] lg:pb-12 lg:pt-28">
          <div className="max-w-[620px] space-y-5 text-white">
            <span className="inline-block rounded-full bg-white/15 px-3.5 py-1.5 text-eyebrow uppercase">Cho thuê xe máy tại Đà Nẵng</span>
            <h1 className="text-[36px] font-bold leading-[1.15] tracking-tight lg:text-hero">Khám phá Đà Nẵng theo cách của bạn</h1>
            <p className="text-base text-white/90 lg:text-lg">Thuê xe máy dễ dàng, chủ động lịch trình và tự do khám phá mọi góc Đà Nẵng cùng T-Bike.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/thue-xe" className="inline-flex h-12 items-center justify-center rounded-[10px] bg-primary px-6 text-[15px] font-semibold text-white hover:bg-primary-hover focus-visible:shadow-focus">Thuê xe ngay</Link>
              <a href="#xe" className="inline-flex h-12 items-center justify-center rounded-[10px] border border-white/70 px-6 text-[15px] font-semibold text-white hover:bg-white/15">Xem xe cho thuê</a>
            </div>
          </div>
          <form onSubmit={search} className="grid gap-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end" aria-label="Tìm xe trống">
            <Field label="Ngày, giờ nhận xe" htmlFor="h-tu"><input id="h-tu" type="datetime-local" className={inputClass} value={tu} onChange={(e) => { setTu(e.target.value); setError(""); }} /></Field>
            <Field label="Ngày, giờ trả xe" htmlFor="h-den" error={error}><input id="h-den" type="datetime-local" className={inputClass} value={den} aria-invalid={!!error} onChange={(e) => { setDen(e.target.value); setError(""); }} /></Field>
            <Field label="Hình thức nhận xe" htmlFor="h-giao">
              <select id="h-giao" className={inputClass} value={giao} onChange={(e) => setGiao(e.target.value)}>
                <option value="TaiCuaHang">Tại cửa hàng</option>
                <option value="GiaoTanNoi">Giao tận nơi (miễn phí ≤ 5 km)</option>
              </select>
            </Field>
            <Button type="submit" size="lg">Tìm xe trống</Button>
          </form>
        </div>
      </section>

      <section id="xe" className="mx-auto max-w-[1440px] space-y-8 px-5 py-12 lg:px-[120px] lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="Xe cho thuê" title="Chọn chiếc xe phù hợp với hành trình của bạn" sub="Xe số và xe tay ga phổ biến, giá tính theo ngày theo loại xe." />
          <div className="flex flex-wrap gap-2 text-[13px] font-semibold">
            <Link to="/thue-xe" className="rounded-full bg-primary px-4 py-2.5 text-white">Tất cả</Link>
            <Link to="/thue-xe?loai=Manual" className="rounded-full border border-line px-4 py-2.5 text-ink">Xe số • 120.000đ/ngày</Link>
            <Link to="/thue-xe?loai=Automatic" className="rounded-full border border-line px-4 py-2.5 text-ink">Xe tay ga • 150.000đ/ngày</Link>
          </div>
        </div>
        {vehicles.isLoading && <LoadingState label="Đang tải danh sách xe…" />}
        {vehicles.isError && <ErrorState message={errorMessage(vehicles.error)} onRetry={() => vehicles.refetch()} />}
        {vehicles.data && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.data.slice(0, 6).map((v) => (
              <article key={v.ma_xe} className="overflow-hidden rounded-panel border border-line bg-white">
                <div className="flex h-[104px] items-center justify-between bg-subtle px-4">
                  <div className="space-y-2"><p className="text-xs text-ink-muted">{v.ma_xe}</p><Badge tone={v.kha_dung ? "success" : "warning"}>{v.kha_dung ? "Khả dụng" : "Không khả dụng"}</Badge></div>
                  <VehiclePhoto tenXe={v.ten_xe} className="h-[88px] w-[160px]" />
                </div>
                <div className="space-y-3 p-4">
                  <h3 className="text-lg font-semibold text-ink">{v.ten_xe}</h3>
                  <p className="text-[13px] text-ink-muted">{VEHICLE_TYPE[v.loai_xe]}</p>
                  <p><span className="text-2xl font-bold text-primary">{formatVnd(v.don_gia_ngay_vnd)}</span> <span className="text-[13px] text-ink-muted">/ ngày</span></p>
                  <Link to={`/thue-xe/${v.ma_xe}/dat`} className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-line text-sm font-semibold text-primary hover:bg-primary-soft">Xem xe & đặt thuê</Link>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="text-[13px] text-ink-muted">Tình trạng xe hiển thị theo thời gian bạn chọn. Gửi yêu cầu chưa phải xác nhận thuê — cửa hàng sẽ gọi lại để xác nhận lịch và đặt cọc.</p>
      </section>

      <section className="bg-page">
        <div className="mx-auto max-w-[1440px] space-y-10 px-5 py-12 lg:px-[120px] lg:py-24">
          <SectionHead center eyebrow="Vì sao chọn T-Bike" title="Thuê xe rõ ràng, nhận xe thuận tiện" />
          <div className="grid items-center gap-10 lg:grid-cols-[520px_1fr]">
            <img src="/images/store.jpg" alt="Cửa hàng T-Bike Đà Nẵng" className="w-full rounded-2xl bg-white object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            <div className="grid gap-5 sm:grid-cols-2">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-line bg-white p-7 shadow-card">
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon size={24} /></span>
                  <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="quy-trinh" className="mx-auto max-w-[1440px] space-y-10 px-5 py-12 lg:px-[120px] lg:py-24">
        <SectionHead center eyebrow="Quy trình thuê xe" title="Thuê xe trong 4 bước đơn giản" />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border border-line bg-white p-7 shadow-card">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">{i + 1}</span>
                <Icon size={24} className="text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{text}</p>
            </li>
          ))}
        </ol>
        <div className="text-center"><Link to="/thue-xe" className="inline-flex h-12 items-center rounded-[10px] bg-primary px-6 text-[15px] font-semibold text-white hover:bg-primary-hover">Bắt đầu đặt xe</Link></div>
      </section>

      <section id="kham-pha" className="bg-page">
        <div className="mx-auto max-w-[1440px] space-y-10 px-5 py-12 lg:px-[120px] lg:py-24">
          <SectionHead center eyebrow="Khám phá Đà Nẵng cùng T-Bike" title="Điểm đến đẹp hơn khi bạn tự do khám phá" />
          <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0">
            {PLACES.map((p) => (
              <article key={p.name} className="w-[290px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-white shadow-card lg:w-auto">
                <img src={p.img} alt={p.name} loading="lazy" className="h-[190px] w-full bg-line object-cover lg:h-64" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                <div className="space-y-2 px-6 py-5"><h3 className="text-xl font-semibold text-ink">{p.name}</h3><p className="text-sm text-ink-muted">{p.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 lg:px-[120px] lg:py-24">
        <div className="flex flex-col gap-6 rounded-3xl bg-primary px-6 py-10 text-white lg:flex-row lg:items-center lg:px-16 lg:py-14">
          <div className="flex-1 space-y-3">
            <h2 className="text-[28px] font-bold lg:text-h2">Sẵn sàng khám phá Đà Nẵng?</h2>
            <p className="text-base text-white/90 lg:text-lg">Chọn chiếc xe phù hợp và chủ động lên lịch trình của bạn cùng T-Bike.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/thue-xe" className="inline-flex h-12 items-center justify-center rounded-[10px] bg-white px-6 text-[15px] font-semibold text-primary hover:bg-primary-soft">Thuê xe ngay</Link>
            <a href="https://zalo.me/0816243243" className="inline-flex h-12 items-center justify-center rounded-[10px] border border-white/70 px-6 text-[15px] font-semibold text-white hover:bg-white/15">Nhắn Zalo 081 624 3243</a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
