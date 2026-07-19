"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export interface BarcodeSearchResult {
  key: string;
  kode_barcode: string;
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
      .not("kode_barcode", "is", null)
      .or(`nama.ilike.%${q}%,kode_barcode.ilike.%${q}%`)
      .limit(20),
    supabase
      .from("product_units")
      .select("id, satuan, harga_jual, harga_beli, kode_barcode, products(nama)")
      .not("kode_barcode", "is", null)
      .ilike("kode_barcode", `%${q}%`)
      .limit(20),
  ]);

  const fromProducts: BarcodeSearchResult[] = (products ?? []).map((p) => ({
    key: `product:${p.id}`,
    kode_barcode: p.kode_barcode as string,
    nama_produk: p.nama,
    satuan: p.satuan,
    harga: p.harga_jual,
  }));

  const fromUnits: BarcodeSearchResult[] = (units ?? []).map((u) => ({
    key: `unit:${u.id}`,
    kode_barcode: u.kode_barcode as string,
    // @ts-expect-error -- relasi nested dari Supabase
    nama_produk: u.products?.nama ?? "-",
    satuan: u.satuan,
    harga: u.harga_jual ?? u.harga_beli,
  }));

  return [...fromProducts, ...fromUnits];
}