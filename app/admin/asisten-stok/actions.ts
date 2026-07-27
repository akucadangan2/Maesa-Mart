"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth-helpers";

export interface StokRow {
  id: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok: number;
  stok_minimum: number;
  qty_perlu_dibeli: number;
  harga_modal: number;
  harga_jual: number;
  total_harga_modal: number;
  satuan_besar_info: string;
  total_terjual?: number;
}

const PRODUCT_SELECT =
  "id, nama, satuan, stok, stok_minimum, harga_modal, harga_jual, categories(nama)";

async function enrichWithSatuanBesar(
  supabase: ReturnType<typeof createServiceRoleClient>,
  products: any[],
  totalTerjualMap?: Map<string, number>
): Promise<StokRow[]> {
  const productIds = products.map((p) => p.id);
  const { data: units } =
    productIds.length > 0
      ? await supabase
          .from("product_units")
          .select("product_id, satuan, konversi, harga_beli, harga_jual")
          .in("product_id", productIds)
      : { data: [] as any[] };

  const unitsByProduct = new Map<string, any[]>();
  for (const u of units ?? []) {
    if (!unitsByProduct.has(u.product_id)) unitsByProduct.set(u.product_id, []);
    unitsByProduct.get(u.product_id)!.push(u);
  }

  return products.map((p) => {
    const qtyPerlu = Math.max(0, (p.stok_minimum ?? 0) - p.stok);
    const unitList = unitsByProduct.get(p.id) ?? [];
    const satuanBesarInfo =
      unitList.length > 0
        ? unitList
            .map(
              (u) =>
                `${u.satuan} x${u.konversi} @Rp${Math.round(u.harga_beli).toLocaleString("id-ID")}`
            )
            .join("; ")
        : "-";

    return {
      id: p.id,
      nama: p.nama,
      kategori: (p.categories as any)?.nama ?? "-",
      satuan: p.satuan,
      stok: p.stok,
      stok_minimum: p.stok_minimum,
      qty_perlu_dibeli: qtyPerlu,
      harga_modal: p.harga_modal,
      harga_jual: p.harga_jual,
      total_harga_modal: qtyPerlu * p.harga_modal,
      satuan_besar_info: satuanBesarInfo,
      total_terjual: totalTerjualMap?.get(p.id),
    };
  });
}

export async function getKategoriList() {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("categories").select("id, nama").order("urutan");
  return data ?? [];
}

// ===== 1. Cek stok produk tertentu =====
export async function cekStokProduk(namaProduk: string): Promise<StokRow[]> {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .ilike("nama", `%${namaProduk}%`)
    .eq("is_aktif", true)
    .limit(20);

  if (error) throw new Error(error.message);
  return enrichWithSatuanBesar(supabase, data ?? []);
}

// ===== 2. Daftar stok menipis/habis (opsional per kategori, opsional urut A-Z) =====
export async function daftarStokMenipisHabis(
  urutkanAbjad: boolean,
  kategoriId?: string
): Promise<StokRow[]> {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();

  let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_aktif", true);
  if (kategoriId) query = query.eq("category_id", kategoriId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const filtered = (data ?? []).filter((p) => p.stok <= (p.stok_minimum ?? 0));
  if (urutkanAbjad) filtered.sort((a, b) => a.nama.localeCompare(b.nama));
  else filtered.sort((a, b) => a.stok - b.stok);

  return enrichWithSatuanBesar(supabase, filtered);
}

// ===== 3. Stok minus =====
export async function daftarStokMinus(): Promise<StokRow[]> {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .lt("stok", 0)
    .eq("is_aktif", true)
    .order("stok", { ascending: true });

  if (error) throw new Error(error.message);
  return enrichWithSatuanBesar(supabase, data ?? []);
}

type Periode = "harian" | "mingguan" | "bulanan" | "tahunan";

function getRentangPeriode(periode: Periode) {
  const sampai = new Date();
  const dari = new Date();
  if (periode === "harian") dari.setHours(0, 0, 0, 0);
  else if (periode === "mingguan") dari.setDate(dari.getDate() - 7);
  else if (periode === "bulanan") dari.setDate(dari.getDate() - 30);
  else dari.setDate(dari.getDate() - 365);
  return { dari: dari.toISOString(), sampai: sampai.toISOString() };
}

// ===== 4. Produk paling laku =====
export async function produkPalingLaku(periode: Periode): Promise<StokRow[]> {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();
  const { dari, sampai } = getRentangPeriode(periode);

  const { data: agg, error } = await supabase.rpc("get_produk_terlaris", {
    dari,
    sampai,
    batas: 30,
  });
  if (error) throw new Error(error.message);
  if (!agg || agg.length === 0) return [];

  const productIds = agg.map((a: any) => a.product_id);
  const { data: products } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds);

  const totalMap = new Map<string, number>(agg.map((a: any) => [a.product_id, Number(a.total_qty)]));
  const ordered = (products ?? []).sort(
    (a, b) => (totalMap.get(b.id) ?? 0) - (totalMap.get(a.id) ?? 0)
  );

  return enrichWithSatuanBesar(supabase, ordered, totalMap);
}

// ===== 5. Produk paling jarang dibeli =====
export async function produkPalingJarang(periode: Periode): Promise<StokRow[]> {
  await requireStaffRole(["super_admin", "admin"]);
  const supabase = createServiceRoleClient();
  const { dari, sampai } = getRentangPeriode(periode);

  const { data: agg, error } = await supabase.rpc("get_produk_paling_jarang", {
    dari,
    sampai,
    batas: 30,
  });
  if (error) throw new Error(error.message);
  if (!agg || agg.length === 0) return [];

  const productIds = agg.map((a: any) => a.product_id);
  const { data: products } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds);

  const totalMap = new Map<string, number>(agg.map((a: any) => [a.product_id, Number(a.total_qty)]));
  const ordered = (products ?? []).sort(
    (a, b) => (totalMap.get(a.id) ?? 0) - (totalMap.get(b.id) ?? 0)
  );

  return enrichWithSatuanBesar(supabase, ordered, totalMap);
}