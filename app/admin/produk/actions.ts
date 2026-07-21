"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

function pesanErrorBarcode(error: { message: string; code?: string }) {
  if (error.code === "23505" || error.message.includes("duplicate key")) {
    return "Kode barcode ini sudah dipakai produk/satuan lain.";
  }
  return error.message;
}

async function uploadFotoIfAda(
  supabase: ReturnType<typeof createServiceRoleClient>,
  foto: FormDataEntryValue | null
) {
  if (!(foto instanceof File) || foto.size === 0) return null;

  const ext = foto.name.split(".").pop();
  const fileName = `${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("produk").upload(fileName, foto, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error("Upload foto gagal: " + error.message);

  const { data } = supabase.storage.from("produk").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function createProduct(formData: FormData) {
  const supabase = createServiceRoleClient();
  const foto_url = await uploadFotoIfAda(supabase, formData.get("foto"));
  const kodeBarcode = (formData.get("kode_barcode") as string)?.trim() || null;

  const { error } = await supabase.from("products").insert({
    category_id: formData.get("category_id"),
    nama: formData.get("nama"),
    deskripsi: (formData.get("deskripsi") as string) || null,
    satuan: (formData.get("satuan") as string) || "pcs",
    harga_modal: Number(formData.get("harga_modal")),
    harga_jual: Number(formData.get("harga_jual")),
    diskon_persen: Number(formData.get("diskon_persen")) || 0,
    stok: Number(formData.get("stok")),
    kode_barcode: kodeBarcode,
    foto_url,
    is_aktif: true,
  });

  if (error) throw new Error(pesanErrorBarcode(error));

  revalidatePath("/admin/produk");
  revalidatePath("/order");
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = createServiceRoleClient();
  const foto_url = await uploadFotoIfAda(supabase, formData.get("foto"));
  const kodeBarcode = (formData.get("kode_barcode") as string)?.trim() || null;

  const updateData: Record<string, unknown> = {
    category_id: formData.get("category_id"),
    nama: formData.get("nama"),
    deskripsi: (formData.get("deskripsi") as string) || null,
    satuan: (formData.get("satuan") as string) || "pcs",
    harga_modal: Number(formData.get("harga_modal")),
    harga_jual: Number(formData.get("harga_jual")),
    diskon_persen: Number(formData.get("diskon_persen")) || 0,
    stok: Number(formData.get("stok")),
    kode_barcode: kodeBarcode,
    is_aktif: formData.get("is_aktif") === "true",
    updated_at: new Date().toISOString(),
  };

  if (foto_url) updateData.foto_url = foto_url;

  const { error } = await supabase.from("products").update(updateData).eq("id", id);
  if (error) throw new Error(pesanErrorBarcode(error));

  revalidatePath("/admin/produk");
  revalidatePath("/order");
}

export async function deleteProduct(id: string): Promise<{ archived: boolean }> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      // Udah kepakai di transaksi, gak bisa dihapus permanen. Otomatis
      // diarsipkan (nonaktifkan) aja, biar tetap cukup 1 klik dari admin.
      const { error: archiveError } = await supabase
        .from("products")
        .update({ is_aktif: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (archiveError) throw new Error(archiveError.message);

      revalidatePath("/admin/produk");
      revalidatePath("/order");
      return { archived: true };
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/produk");
  revalidatePath("/order");
  return { archived: false };
}

// ===== Satuan besar (DOS/PAK) per produk =====

export async function getProductUnits(productId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("product_units")
    .select("*")
    .eq("product_id", productId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data;
}

export async function createProductUnit(productId: string, formData: FormData) {
  const supabase = createServiceRoleClient();
  const hargaJual = formData.get("harga_jual");

  const { error } = await supabase.from("product_units").insert({
    product_id: productId,
    satuan: formData.get("satuan"),
    konversi: Number(formData.get("konversi")),
    kode_barcode: (formData.get("kode_barcode") as string)?.trim() || null,
    harga_beli: Number(formData.get("harga_beli")) || 0,
    harga_jual: hargaJual ? Number(hargaJual) : null,
  });

  if (error) throw new Error(pesanErrorBarcode(error));

  revalidatePath("/admin/produk");
}

export async function deleteProductUnit(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("product_units").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/produk");
}