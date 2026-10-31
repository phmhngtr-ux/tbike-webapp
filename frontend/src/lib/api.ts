// API client tap trung: gan access token, chuan hoa loi, bao 401 de dang xuat.
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;
interface Options { method?: "GET" | "POST" | "PATCH"; body?: unknown; query?: Query; auth?: boolean }

let getToken: () => Promise<string | null> = async () => null;
let onUnauthorized: (code: string) => void = () => {};
const BASE = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function configureApi(cfg: { getToken: () => Promise<string | null>; onUnauthorized: (code: string) => void }) {
  getToken = cfg.getToken;
  onUnauthorized = cfg.onUnauthorized;
}

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
    else params.append(k, String(v));
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ""}`;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false) {
    const token = await getToken();
    if (!token) {
      onUnauthorized("AUTH_REQUIRED");
      throw new ApiError(401, "AUTH_REQUIRED", "Vui lòng đăng nhập để tiếp tục");
    }
    headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    const apiErr = new ApiError(res.status, err?.code ?? `HTTP_${res.status}`, err?.message ?? "Có lỗi xảy ra, vui lòng thử lại", err?.details);
    if (res.status === 401 && opts.auth !== false) onUnauthorized(apiErr.code);
    throw apiErr;
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Loi validate dang [{field, message}] -> map field -> thong bao */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return {};
  const out: Record<string, string> = {};
  for (const d of err.details as { field?: string; message?: string }[]) {
    if (d.field && d.message && !out[d.field]) out[d.field] = d.message.replace(/^Value error, /, "");
  }
  return out;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fe = Object.values(fieldErrors(err));
    return fe.length ? `${err.message}: ${fe[0]}` : err.message;
  }
  return "Có lỗi xảy ra, vui lòng thử lại";
}
