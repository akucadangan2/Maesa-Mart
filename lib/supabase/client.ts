// lib/supabase/client.ts
// Dipakai di Client Component ("use client"): halaman /order, /login, /daftar, /akun.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
