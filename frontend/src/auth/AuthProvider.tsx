import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, configureApi } from "../lib/api";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type { StaffProfile } from "../lib/types";
import { staffApi } from "../services/staffApi";

/** Het phien sau 30 phut khong thao tac (A3 · Phien dang nhap het han) */
const IDLE_LIMIT_MS = 30 * 60 * 1000;

type Status = "loading" | "signedOut" | "ready" | "forbidden" | "error";
type SignOutReason = "manual" | "expired" | "idle";

interface AuthState {
  status: Status;
  profile: StaffProfile | null;
  forbiddenCode: string | null;
  errorMessage: string | null;
  signOutReason: SignOutReason | null;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (reason?: SignOutReason) => Promise<void>;
  retry: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>(supabaseConfigured ? "loading" : "signedOut");
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [forbiddenCode, setForbiddenCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signOutReason, setSignOutReason] = useState<SignOutReason | null>(null);
  const [reload, setReload] = useState(0);
  const lastActivity = useRef(Date.now());

  const signOut = useCallback(async (reason: SignOutReason = "manual") => {
    setSignOutReason(reason);
    setProfile(null);
    setStatus("signedOut");
    queryClient.clear();
    if (supabase) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }, [queryClient]);

  // API client: lay token hien tai; 401 -> dang xuat va bao het phien
  useEffect(() => {
    configureApi({
      getToken: async () => (supabase ? (await supabase.auth.getSession()).data.session?.access_token ?? null : null),
      onUnauthorized: () => void signOut("expired"),
    });
  }, [signOut]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setStatus("signedOut");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setStatus((prev) => (prev === "loading" || prev === "ready" ? "signedOut" : prev));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Co session -> hoi backend ho so nhan vien (vai tro lay tu DB)
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setStatus("loading");
    staffApi.me().then(
      (p) => {
        if (cancelled) return;
        setProfile(p);
        setForbiddenCode(null);
        setErrorMessage(null);
        setSignOutReason(null);
        setStatus("ready");
      },
      (err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setForbiddenCode(err.code);
          setStatus("forbidden");
        } else if (err instanceof ApiError && err.status === 401) {
          setStatus("signedOut");
        } else {
          setErrorMessage(err instanceof ApiError ? err.message : "Không kết nối được máy chủ");
          setStatus("error");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [session?.access_token, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tu dang xuat khi khong thao tac qua 30 phut
  useEffect(() => {
    if (status !== "ready") return;
    const mark = () => (lastActivity.current = Date.now());
    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_LIMIT_MS) void signOut("idle");
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      window.clearInterval(timer);
    };
  }, [status, signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Chưa cấu hình Supabase cho frontend (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const msg = /invalid login credentials/i.test(error.message)
        ? "Email hoặc mật khẩu không đúng"
        : /rate|too many/i.test(error.message)
          ? "Bạn đăng nhập sai quá nhiều lần, vui lòng thử lại sau ít phút"
          : "Không đăng nhập được, vui lòng thử lại";
      throw new Error(msg);
    }
    lastActivity.current = Date.now();
  }, []);

  const value = useMemo<AuthState>(() => ({
    status, profile, forbiddenCode, errorMessage, signOutReason, configured: supabaseConfigured,
    signIn, signOut, retry: () => setReload((n) => n + 1),
  }), [status, profile, forbiddenCode, errorMessage, signOutReason, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
