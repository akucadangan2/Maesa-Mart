"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export interface MemberResult {
  id: string;
  nama: string;
  no_hp: string;
  total_poin: number;
}

export async function cariMember(query: string): Promise<MemberResult[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, nama, no_hp, total_poin")
    .or(`no_hp.ilike.%${q}%,nama.ilike.%${q}%`)
    .limit(10);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface DiskonTierRingkas {
  minimal_poin: number;
  diskon_persen: number;
  minimal_belanja: number;
}

export async function getActiveTiers(): Promise<DiskonTierRingkas[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("membership_diskon_tier")
    .select("minimal_poin, diskon_persen, minimal_belanja")
    .eq("is_aktif", true)
    .order("diskon_persen", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}