"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export interface PengeluaranSearchResult {
  key: string;
  product_id: string;
  nama_produk: string;
  satuan: string;
  harga_modal_terakhir: number;
  foto_url: string | null;
}

export async function searchProdukPengeluaran(query: string): Promise<PengeluaranSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("products")
    .select("id, nama, satuan, harga_modal, foto_url")
    .or(`nama.ilike.%${q}%,kode_barcode.ilike.%${q}%`)
    .limit(15);

  return (data ?? []).map((p) => ({
    key: p.id,
    product_id: p.id,
    nama_produk: p.nama,
    satuan: p.satuan,
    harga_modal_terakhir: p.harga_modal,
    foto_url: p.foto_url,
  }));
}

export async function createExpense(formData: FormData) {
  const supabase = createServiceRoleClient();
  const count = Number(formData.get("count") ?? 0);
  const supplierId = (formData.get("supplier_id") as string) || null;
  const sumberLainnya = (formData.get("sumber_lainnya") as string) || null;

  interface ItemToInsert {
    product_id: string | null;
    nama: string;
    satuan: string | null;
    harga: number;
    jumlah: number;
    total: number;
    foto_nota_url: string | null;
  }

  const items: ItemToInsert[] = [];

  for (let i = 0; i < count; i++) {
    const product_id = (formData.get(`items[${i}][product_id]`) as string) || null;
    const nama = formData.get(`items[${i}][nama]`) as string;
    const satuan = (formData.get(`items[${i}][satuan]`) as string) || null;
    const harga = Number(formData.get(`items[${i}][harga]`));
    const jumlah = Number(formData.get(`items[${i}][jumlah]`));
    const foto = formData.get(`items[${i}][foto]`);

    let foto_nota_url: string | null = null;
    if (foto instanceof File && foto.size > 0) {
      const ext = foto.name.split(".").pop();
      const fileName = `${randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("nota-pengeluaran").upload(fileName, foto);
      if (!error) {
        const { data } = supabase.storage.from("nota-pengeluaran").getPublicUrl(fileName);
        foto_nota_url = data.publicUrl;
      }
    }

    items.push({ product_id, nama, satuan, harga, jumlah, total: harga * jumlah, foto_nota_url });
  }

  if (items.length === 0) throw new Error("Belum ada item.");

  const totalPengeluaran = items.reduce((sum, it) => sum + it.total, 0);

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      total_pengeluaran: totalPengeluaran,
      supplier_id: supplierId,
      sumber_lainnya: sumberLainnya,
    })
    .select()
    .single();

  if (expenseError || !expense) {
    throw new Error("Gagal menyimpan pengeluaran: " + expenseError?.message);
  }

  const rows = items.map((it) => ({ expense_id: expense.id, ...it }));
  const { error: itemsError } = await supabase.from("expense_items").insert(rows);
  if (itemsError) throw new Error("Gagal menyimpan item: " + itemsError.message);

  for (const it of items) {
    if (!it.product_id) continue;

    const { data: currentProduct } = await supabase
      .from("products")
      .select("stok")
      .eq("id", it.product_id)
      .single();

    const stokBaru = (currentProduct?.stok ?? 0) + it.jumlah;

    await supabase
      .from("products")
      .update({ stok: stokBaru, harga_modal: it.harga, updated_at: new Date().toISOString() })
      .eq("id", it.product_id);
  }

  revalidatePath("/admin/pengeluaran");
  revalidatePath("/admin/pengeluaran/riwayat");
  revalidatePath("/admin/produk");
  revalidatePath("/order");
}