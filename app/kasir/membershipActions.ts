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

export async function awardPoinUntukOrder(orderId: string) {
  const supabase = createServiceRoleClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_id")
    .eq("id", orderId)
    .single();

  if (!order?.customer_id) return; // pesanan tamu, gak ada member, gak ada poin

  // Cegah dobel poin kalau fungsi ini kepanggil lebih dari sekali buat order yang sama
  const { data: existingLog } = await supabase
    .from("membership_poin_log")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existingLog) return;

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, product_unit_id, qty")
    .eq("order_id", orderId);

  if (!items || items.length === 0) return;

  const productIds = [...new Set(items.map((it) => it.product_id))];
  const { data: poinConfigs } = await supabase
    .from("product_poin_config")
    .select("product_id, product_unit_id, poin_per_unit")
    .in("product_id", productIds);

  let poinDiperoleh = 0;
  for (const it of items) {
    const config = (poinConfigs ?? []).find(
      (c) => c.product_id === it.product_id && (c.product_unit_id ?? null) === (it.product_unit_id ?? null)
    );
    if (config) poinDiperoleh += config.poin_per_unit * it.qty;
  }

  if (poinDiperoleh <= 0) return;

  const { data: customerRow } = await supabase
    .from("customers")
    .select("total_poin")
    .eq("id", order.customer_id)
    .single();

  await supabase.from("membership_poin_log").insert({
    customer_id: order.customer_id,
    order_id: orderId,
    poin_diperoleh: poinDiperoleh,
    keterangan: "Pesanan online",
  });

  await supabase
    .from("customers")
    .update({ total_poin: (customerRow?.total_poin ?? 0) + poinDiperoleh })
    .eq("id", order.customer_id);
}