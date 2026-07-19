"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export async function getExpenseDetail(id: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*, expense_items(*)")
    .eq("id", id)
    .single();

  if (error || !data) throw new Error("Gagal memuat detail pengeluaran.");
  return data;
}