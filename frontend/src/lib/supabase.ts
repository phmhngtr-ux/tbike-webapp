import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Chi dung anon/publishable key (cong khai). Supabase chi xu ly dang nhap nhan vien;
// MOI du lieu nghiep vu di qua Backend API.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;
