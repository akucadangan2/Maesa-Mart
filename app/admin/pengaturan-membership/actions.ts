"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProdukDenganPoin() {
  const supabase = createServiceRoleClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, nama, satuan, product_units(id, satuan)")
    .eq("is_aktif", true)
    .order("nama");

  if (error) throw new Error(error.message);

  const { data: poinConfig } = await supabase.from("product_poin_config").select("*");

  const poinMap = new Map(
    (poinConfig ?? []).map((p) => [`${p.product_id}-${p.product_unit_id ?? "base"}`, p])
  );

  return (products ?? []).map((p: any) => ({
    id: p.id,
    nama: p.nama,
    units: [
      {
        product_unit_id: null,
        satuan: p.satuan,
        poin: poinMap.get(`${p.id}-base`)?.poin_per_unit ?? 0,
        config_id: poinMap.get(`${p.id}-base`)?.id ?? null,
      },
      ...(p.product_units ?? []).map((u: any) => ({
        product_unit_id: u.id,
        satuan: u.satuan,
        poin: poinMap.get(`${p.id}-${u.id}`)?.poin_per_unit ?? 0,
        config_id: poinMap.get(`${p.id}-${u.id}`)?.id ?? null,
      })),
    ],
  }));
}

export async function updatePoinProduk(
  productId: string,
  productUnitId: string | null,
  poin: number
) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("product_poin_config").upsert(
    {
      product_id: productId,
      product_unit_id: productUnitId,
      poin_per_unit: Math.max(0, poin),
    },
    { onConflict: "product_id,product_unit_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/admin/pengaturan-membership");
}

export async function getDiskonTiers() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("membership_diskon_tier")
    .select("*")
    .order("minimal_poin");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDiskonTier(data: {
  nama_tier: string;
  minimal_poin: number;
  diskon_persen: number;
  minimal_belanja: number;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("membership_diskon_tier").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pengaturan-membership");
}

export async function toggleDiskonTier(id: string, isAktif: boolean) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("membership_diskon_tier")
    .update({ is_aktif: isAktif })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pengaturan-membership");
}

export async function deleteDiskonTier(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("membership_diskon_tier").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pengaturan-membership");
}