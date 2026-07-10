import { createClient } from "@supabase/supabase-js";

// 서버 전용 — service_role key로 RLS 우회
export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
