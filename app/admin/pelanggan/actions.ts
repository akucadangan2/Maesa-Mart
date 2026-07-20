"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export async function getCustomerDetail(customerId: string) {
  const supabase = createServiceRoleClient();

  const [{ data: orders }, { data: favorit }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, nomor_order, total_jual, status_pesanan, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("v_produk_favorit_customer")
      .select("*")
      .eq("customer_id", customerId)
      .order("total_qty_dibeli", { ascending: false })
      .limit(5),
  ]);

  return { orders: orders ?? [], favorit: favorit ?? [] };
}