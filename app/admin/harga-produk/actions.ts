"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export async function getProductsForHarga() {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, nama, satuan, kode_barcode, harga_modal, harga_jual, diskon_persen, stok")
    .order("nama");

  if (error) throw new Error(error.message);
  return data;
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