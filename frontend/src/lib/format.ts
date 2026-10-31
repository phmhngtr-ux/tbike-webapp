// Dinh dang hien thi + chuyen doi thoi gian. Gio hien thi va nhap lieu theo Asia/Ho_Chi_Minh (+07:00).
const TZ = "Asia/Ho_Chi_Minh";

export function formatVnd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n).toLocaleString("vi-VN").replace(/,/g, ".")}đ`;
}

export function formatKm(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toLocaleString("vi-VN").replace(/,/g, ".")} km`;
}

function parts(iso: string) {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = parts(iso);
  return `${p.d}/${p.m}/${p.y} ${p.h}:${p.mi}`;
}

export function formatShortDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = parts(iso);
  return `${p.d}/${p.m} ${p.h}:${p.mi}`;
}

export function formatTime(iso: string): string {
  const p = parts(iso);
  return `${p.h}:${p.mi}`;
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Gia tri <input type="datetime-local"> (hieu la gio Viet Nam) -> ISO 8601 co mui gio */
export function toApiDateTime(local: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error("Thời gian không hợp lệ");
  return `${local}:00+07:00`;
}

/** ISO -> gia tri cho <input type="datetime-local"> theo gio Viet Nam */
export function toLocalInput(iso: string): string {
  const p = parts(iso);
  return `${p.y}-${p.m}-${p.d}T${p.h}:${p.mi}`;
}

export function nowLocalInput(offsetMinutes = 0): string {
  return toLocalInput(new Date(Date.now() + offsetMinutes * 60000).toISOString());
}

export function todayVn(): string {
  return nowLocalInput().slice(0, 10);
}

export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 phút";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m} phút`;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

export function rentalDays(startIso: string, endIso: string): number {
  const hours = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
  return Math.max(1, Math.ceil(hours / 24 - 1e-9));
}

export function slugify(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function vehicleImage(tenXe: string): string {
  return `/images/vehicles/${slugify(tenXe)}.png`;
}
