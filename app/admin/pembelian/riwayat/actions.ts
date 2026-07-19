"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export async function getPurchaseDetail(id: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("*, suppliers(nama), purchase_items(*)")
    .eq("id", id)
    .single();

  if (error || !data) throw new Error("Gagal memuat detail pembelian.");
  return data;
}