"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMinimalBelanja(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "minimal_belanja_online")
    .maybeSingle();
  return Number(data?.value ?? 0);
}

export async function updateMinimalBelanja(nilai: number) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "minimal_belanja_online", value: String(Math.max(0, nilai)) });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/pengaturan-toko");
  revalidatePath("/order");
}