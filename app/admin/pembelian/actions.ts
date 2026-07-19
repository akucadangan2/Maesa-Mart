"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface PembelianSearchResult {
  key: string;
  product_id: string;
  product_unit_id: string | null;
  nama_produk: string;
  satuan: string;
  konversi: number;
  harga_beli_default: number;
  foto_url: string | null;
}

export async function searchProdukPembelian(query: string): Promise<PembelianSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createServiceRoleClient();

  const [{ data: products }, { data: units }] = await Promise.all([
    supabase
      .from("products")
      .select("id, nama, satuan, harga_modal, foto_url, kode_barcode")
      .or(`nama.ilike.%${q}%,kode_barcode.ilike.%${q}%`)
      .limit(15),
    supabase
      .from("product_units")
      .select("id, satuan, konversi, harga_beli, kode_barcode, product_id, products(nama, foto_url)")
      .ilike("kode_barcode", `%${q}%`)
      .limit(15),
  ]);

  const fromProducts: PembelianSearchResult[] = (products ?? []).map((p) => ({
    key: `product:${p.id}`,
    product_id: p.id,
    product_unit_id: null,
    nama_produk: p.nama,
    satuan: p.satuan,
    konversi: 1,
    harga_beli_default: p.harga_modal,
    foto_url: p.foto_url,
  }));

  const fromUnits: PembelianSearchResult[] = (units ?? []).map((u) => ({
    key: `unit:${u.id}`,
    product_id: u.product_id,
    product_unit_id: u.id,
    // @ts-expect-error -- relasi nested dari Supabase
    nama_produk: u.products?.nama ?? "-",
    satuan: u.satuan,
    konversi: u.konversi,
    harga_beli_default: u.harga_beli,
    // @ts-expect-error -- relasi nested dari Supabase
    foto_url: u.products?.foto_url ?? null,
  }));

  return [...fromProducts, ...fromUnits];
}

interface CreatePurchaseItem {
  product_id: string;
  product_unit_id: string | null;
  nama_produk_snapshot: string;
  satuan: string;
  konversi: number;
  harga_beli: number;
  jumlah: number;
  tgl_kadaluarsa: string | null;
}

export async function createPurchase(payload: {
  supplier_id: string | null;
  no_faktur: string | null;
  items: CreatePurchaseItem[];
}) {
  const supabase = createServiceRoleClient();

  const itemsWithTotal = payload.items.map((it) => ({
    ...it,
    jumlah_dalam_eceran: it.jumlah * it.konversi,
    total: it.harga_beli * it.jumlah,
  }));

  const totalBayar = itemsWithTotal.reduce((sum, it) => sum + it.total, 0);

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      supplier_id: payload.supplier_id,
      no_faktur: payload.no_faktur,
      total_bayar: totalBayar,
    })
    .select()
    .single();

  if (purchaseError || !purchase) {
    throw new Error("Gagal menyimpan transaksi: " + purchaseError?.message);
  }

  const itemRows = itemsWithTotal.map((it) => ({
    purchase_id: purchase.id,
    product_id: it.product_id,
    product_unit_id: it.product_unit_id,
    nama_produk_snapshot: it.nama_produk_snapshot,
    satuan: it.satuan,
    harga_beli: it.harga_beli,
    jumlah: it.jumlah,
    jumlah_dalam_eceran: it.jumlah_dalam_eceran,
    total: it.total,
    tgl_kadaluarsa: it.tgl_kadaluarsa,
  }));

  const { error: itemsError } = await supabase.from("purchase_items").insert(itemRows);
  if (itemsError) throw new Error("Gagal menyimpan item: " + itemsError.message);

  // Update stok (nambah, dikonversi ke satuan eceran) & harga modal per produk.
  // Harga modal dihitung ulang per satuan eceran, konsisten dengan snapshot
  // harga di order_items yang sudah ada sebelumnya (perubahan ini cuma
  // pengaruh ke penjualan berikutnya, bukan histori lama).
  for (const it of itemsWithTotal) {
    const { data: currentProduct } = await supabase
      .from("products")
      .select("stok")
      .eq("id", it.product_id)
      .single();

    const stokBaru = (currentProduct?.stok ?? 0) + it.jumlah_dalam_eceran;
    const hargaModalBaru = it.harga_beli / it.konversi;

    await supabase
      .from("products")
      .update({ stok: stokBaru, harga_modal: hargaModalBaru, updated_at: new Date().toISOString() })
      .eq("id", it.product_id);
  }

  revalidatePath("/admin/pembelian");
  revalidatePath("/admin/pembelian/riwayat");
  revalidatePath("/admin/produk");
  revalidatePath("/order");

  return purchase.id;
}