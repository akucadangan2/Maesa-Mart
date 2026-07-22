"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function getProductsForHarga(status: string = "aktif") {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("products")
    .select("id, nama, satuan, kode_barcode, harga_modal, harga_jual, diskon_persen, stok, is_aktif")
    .order("nama");

  if (status === "aktif") {
    query = query.eq("is_aktif", true);
  } else if (status === "arsip") {
    query = query.eq("is_aktif", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getHargaProdukStatusCounts() {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();

  const [{ count: aktifCount }, { count: arsipCount }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_aktif", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_aktif", false),
  ]);

  return {
    aktif: aktifCount ?? 0,
    arsip: arsipCount ?? 0,
    semua: (aktifCount ?? 0) + (arsipCount ?? 0),
  };
}

export async function updateHargaProduk(
  id: string,
  data: { harga_modal: number; harga_jual: number; diskon_persen: number; stok: number }
) {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("products")
    .update({
      harga_modal: data.harga_modal,
      harga_jual: data.harga_jual,
      diskon_persen: data.diskon_persen,
      stok: data.stok,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/harga-produk");
  revalidatePath("/admin/produk");
  revalidatePath("/order");
}