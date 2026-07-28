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

export async function getBatasQty(): Promise<{ kecil: number; besar: number }> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["batas_qty_satuan_kecil", "batas_qty_satuan_besar"]);

  const map = new Map((data ?? []).map((d) => [d.key, Number(d.value)]));
  return {
    kecil: map.get("batas_qty_satuan_kecil") ?? 0,
    besar: map.get("batas_qty_satuan_besar") ?? 0,
  };
}

export async function updateBatasQty(kecil: number, besar: number) {
  const supabase = createServiceRoleClient();

  const { error: error1 } = await supabase
    .from("app_settings")
    .upsert({ key: "batas_qty_satuan_kecil", value: String(Math.max(0, kecil)) });
  if (error1) throw new Error(error1.message);

  const { error: error2 } = await supabase
    .from("app_settings")
    .upsert({ key: "batas_qty_satuan_besar", value: String(Math.max(0, besar)) });
  if (error2) throw new Error(error2.message);

  revalidatePath("/admin/pengaturan-toko");
  revalidatePath("/order");
}