"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BarcodeSearchResult {
  key: string;
  product_id: string;
  kode_barcode: string | null;
  nama_produk: string;
  satuan: string;
  harga: number;
}

export async function searchBarcodeItems(query: string): Promise<BarcodeSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createServiceRoleClient();

  const [{ data: products }, { data: units }] = await Promise.all([
    supabase
      .from("products")
      .select("id, nama, satuan, harga_jual, kode_barcode")
      .or(`nama.ilike.%${q}%,kode_barcode.ilike.%${q}%`)
      .limit(20),
    supabase
      .from("product_units")
      .select("id, product_id, satuan, harga_jual, harga_beli, kode_barcode, products(nama)")
      .not("kode_barcode", "is", null)
      .ilike("kode_barcode", `%${q}%`)
      .limit(20),
  ]);

  const fromProducts: BarcodeSearchResult[] = (products ?? []).map((p) => ({
    key: `product:${p.id}`,
    product_id: p.id,
    kode_barcode: p.kode_barcode,
    nama_produk: p.nama,
    satuan: p.satuan,
    harga: p.harga_jual,
  }));

  const fromUnits: BarcodeSearchResult[] = (units ?? []).map((u: any) => ({
    key: `unit:${u.id}`,
    product_id: u.product_id,
    kode_barcode: u.kode_barcode,
    nama_produk: u.products?.nama ?? "-",
    satuan: u.satuan,
    harga: u.harga_jual ?? u.harga_beli,
  }));

  return [...fromProducts, ...fromUnits];
}

export async function generateBarcodeForProduct(productId: string): Promise<string> {
  const supabase = createServiceRoleClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const kode = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join("");

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("kode_barcode", kode)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase
        .from("products")
        .update({ kode_barcode: kode, updated_at: new Date().toISOString() })
        .eq("id", productId);

      if (error) throw new Error(error.message);

      revalidatePath("/admin/produk");
      revalidatePath("/admin/barcode");
      return kode;
    }
  }

  throw new Error("Gagal bikin kode barcode unik, coba lagi.");
}