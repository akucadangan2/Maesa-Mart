"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface KasirUnitOption {
  product_unit_id: string | null;
  satuan: string;
  konversi: number;
  harga_jual: number;
  harga_modal_per_eceran: number;
}

export interface KasirSearchResult {
  product_id: string;
  nama_produk: string;
  foto_url: string | null;
  stok_tersedia_eceran: number;
  units: KasirUnitOption[];
  matchedUnitKey: string;
}

function hitungHargaEfektif(hargaJual: number, diskonPersen: number) {
  return diskonPersen > 0 ? Math.round(hargaJual * (1 - diskonPersen / 100)) : hargaJual;
}

const PRODUCT_SELECT =
  "id, nama, satuan, harga_jual, harga_modal, diskon_persen, stok, foto_url, kode_barcode, is_aktif, product_units(id, satuan, konversi, harga_jual, harga_beli, kode_barcode)";

function buildResult(product: any, matchedUnitKey: string): KasirSearchResult {
  const baseUnit: KasirUnitOption = {
    product_unit_id: null,
    satuan: product.satuan,
    konversi: 1,
    harga_jual: hitungHargaEfektif(product.harga_jual, product.diskon_persen),
    harga_modal_per_eceran: product.harga_modal,
  };

  const extraUnits: KasirUnitOption[] = (product.product_units ?? [])
    .filter((u: any) => u.harga_jual != null)
    .map((u: any) => ({
      product_unit_id: u.id,
      satuan: u.satuan,
      konversi: u.konversi,
      harga_jual: u.harga_jual,
      harga_modal_per_eceran: u.harga_beli / u.konversi,
    }));

  return {
    product_id: product.id,
    nama_produk: product.nama,
    foto_url: product.foto_url,
    stok_tersedia_eceran: product.stok,
    units: [baseUnit, ...extraUnits],
    matchedUnitKey,
  };
}

export async function searchKasirItems(query: string): Promise<KasirSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createServiceRoleClient();

  const [{ data: byProduct }, { data: unitMatches }] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_aktif", true)
      .or(`nama.ilike.%${q}%,kode_barcode.ilike.%${q}%`)
      .limit(15),
    supabase
      .from("product_units")
      .select("id, product_id, kode_barcode")
      .ilike("kode_barcode", `%${q}%`)
      .limit(15),
  ]);

  const resultsMap = new Map<string, KasirSearchResult>();

  for (const p of byProduct ?? []) {
    resultsMap.set(p.id, buildResult(p, "base"));
  }

  const missingProductIds = (unitMatches ?? [])
    .map((u) => u.product_id)
    .filter((id) => !resultsMap.has(id));

  if (missingProductIds.length > 0) {
    const { data: extraProducts } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .in("id", missingProductIds)
      .eq("is_aktif", true);

    for (const p of extraProducts ?? []) {
      const matchedUnit = (unitMatches ?? []).find((u) => u.product_id === p.id);
      resultsMap.set(p.id, buildResult(p, matchedUnit?.id ?? "base"));
    }
  }

  for (const u of unitMatches ?? []) {
    const existing = resultsMap.get(u.product_id);
    if (existing && existing.matchedUnitKey === "base") existing.matchedUnitKey = u.id;
  }

  return Array.from(resultsMap.values());
}

interface PosSaleItem {
  product_id: string;
  product_unit_id: string | null;
  nama_produk: string;
  satuan: string;
  konversi: number;
  harga_jual: number;
  harga_modal_per_eceran: number;
  qty: number;
}

export async function createPosSale(payload: {
  kasir_id: string;
  customer_id?: string | null;
  metode_bayar: "tunai" | "kartu" | "transfer" | "ewallet";
  detail_bayar: string | null;
  no_referensi: string | null;
  uang_diterima: number | null;
  diskon_manual: number;
  nama_pembeli_pos: string | null;
  kode_pembeli_pos: string | null;
  items: PosSaleItem[];
}) {
  if (payload.items.length === 0) throw new Error("Keranjang masih kosong.");

  const supabase = createServiceRoleClient();

  const subtotal = payload.items.reduce((sum, it) => sum + it.harga_jual * it.qty, 0);

  // ===== Diskon membership (kalau ada member dipilih) =====
  // Cek data member + tier diskon SEKALIGUS (paralel), bukan satu-satu,
  // biar gak nambah waktu tunggu berurutan.
  let diskonMembership = 0;
  let member: { id: string; total_poin: number } | null = null;

  if (payload.customer_id) {
    const [{ data: customerRow }, { data: tiers }] = await Promise.all([
      supabase.from("customers").select("id, nama, no_hp, total_poin").eq("id", payload.customer_id).single(),
      supabase
        .from("membership_diskon_tier")
        .select("minimal_poin, diskon_persen, minimal_belanja")
        .eq("is_aktif", true),
    ]);

    if (customerRow) {
      member = customerRow;
      const eligible = (tiers ?? []).filter(
        (t) => member!.total_poin >= t.minimal_poin && subtotal >= t.minimal_belanja
      );

      if (eligible.length > 0) {
        const best = eligible.reduce((a, b) => (b.diskon_persen > a.diskon_persen ? b : a));
        diskonMembership = Math.round(subtotal * (best.diskon_persen / 100));
      }
    }
  }

  const totalJual = Math.max(0, subtotal - payload.diskon_manual - diskonMembership);
  const totalModal = payload.items.reduce(
    (sum, it) => sum + it.harga_modal_per_eceran * it.qty * it.konversi,
    0
  );

  const orderId = crypto.randomUUID();
  const nomorOrder = `POS-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    nomor_order: nomorOrder,
    channel: "pos",
    kasir_id: payload.kasir_id,
    customer_id: payload.customer_id ?? null,
    guest_nama: null,
    guest_no_hp: null,
    nama_pembeli_pos: payload.nama_pembeli_pos,
    kode_pembeli_pos: payload.kode_pembeli_pos,
    metode_bayar: payload.metode_bayar,
    detail_bayar: payload.detail_bayar,
    no_referensi: payload.no_referensi,
    diskon_manual: payload.diskon_manual,
    diskon_membership: diskonMembership,
    status_pesanan: "selesai",
    status_pembayaran: "lunas",
    catatan: null,
    total_modal: totalModal,
    total_jual: totalJual,
  });

  if (orderError) throw new Error("Gagal menyimpan transaksi: " + orderError.message);

  const orderItemsPayload = payload.items.map((it) => ({
    order_id: orderId,
    product_id: it.product_id,
    product_unit_id: it.product_unit_id,
    nama_produk_snapshot: it.nama_produk,
    qty: it.qty,
    harga_modal_saat_itu: it.harga_modal_per_eceran,
    harga_jual_saat_itu: it.harga_jual,
    subtotal: it.harga_jual * it.qty,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
  if (itemsError) throw new Error("Gagal menyimpan item: " + itemsError.message);

  // Gabungin dulu per produk (kalau ada produk sama muncul 2x di keranjang
  // dengan satuan beda), baru proses SEMUA produk bebarengan (paralel),
  // bukan antre satu-satu. Sekaligus jalan bebarengan sama pengecekan poin
  // per produk di bawah, karena dua-duanya gak saling butuh hasil satu sama lain.
  const stokDecrements = new Map<string, number>();
  for (const it of payload.items) {
    const decrement = it.qty * it.konversi;
    stokDecrements.set(it.product_id, (stokDecrements.get(it.product_id) ?? 0) + decrement);
  }

  const productIds = [...new Set(payload.items.map((it) => it.product_id))];

  const [, poinConfigsResult] = await Promise.all([
    Promise.all(
      Array.from(stokDecrements.entries()).map(async ([productId, decrement]) => {
        const { data: currentProduct } = await supabase
          .from("products")
          .select("stok")
          .eq("id", productId)
          .single();

        const stokBaru = (currentProduct?.stok ?? 0) - decrement;

        await supabase
          .from("products")
          .update({ stok: stokBaru, updated_at: new Date().toISOString() })
          .eq("id", productId);
      })
    ),
    member
      ? supabase
          .from("product_poin_config")
          .select("product_id, product_unit_id, poin_per_unit")
          .in("product_id", productIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // ===== Poin membership (kalau ada member) =====
  let poinDiperoleh = 0;
  if (member) {
    const poinConfigs = (poinConfigsResult as any).data ?? [];
    for (const it of payload.items) {
      const config = poinConfigs.find(
        (c: any) =>
          c.product_id === it.product_id &&
          (c.product_unit_id ?? null) === (it.product_unit_id ?? null)
      );
      if (config) poinDiperoleh += config.poin_per_unit * it.qty;
    }

    if (poinDiperoleh > 0) {
      // Insert log poin + update total poin member bisa jalan bebarengan,
      // dua-duanya gak butuh hasil satu sama lain.
      await Promise.all([
        supabase.from("membership_poin_log").insert({
          customer_id: member.id,
          order_id: orderId,
          poin_diperoleh: poinDiperoleh,
          keterangan: `Transaksi ${nomorOrder}`,
        }),
        supabase
          .from("customers")
          .update({ total_poin: member.total_poin + poinDiperoleh })
          .eq("id", member.id),
      ]);
    }
  }

  revalidatePath("/admin/produk");
  revalidatePath("/admin/pelanggan");
  revalidatePath("/order");

  const kembalian =
    payload.metode_bayar === "tunai" && payload.uang_diterima !== null
      ? payload.uang_diterima - totalJual
      : null;

  return {
    nomor_order: nomorOrder,
    total_jual: totalJual,
    kembalian,
    metode_bayar: payload.metode_bayar,
    detail_bayar: payload.detail_bayar,
    no_referensi: payload.no_referensi,
    nama_pembeli: payload.nama_pembeli_pos,
    diskon_membership: diskonMembership,
    poin_diperoleh: poinDiperoleh,
    member_nama: member?.nama ?? null,
    member_no_hp: member?.no_hp ?? null,
    created_at: new Date().toISOString(),
    items: payload.items.map((it) => ({
      nama: it.nama_produk,
      qty: it.qty,
      satuan: it.satuan,
      harga_satuan: it.harga_jual,
      subtotal: it.harga_jual * it.qty,
    })),
  };
}

export async function getRiwayatKasirHariIni(kasirId: string) {
  const supabase = createServiceRoleClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("orders")
    .select(
      "id, nomor_order, total_jual, metode_bayar, detail_bayar, no_referensi, nama_pembeli_pos, created_at, order_items(nama_produk_snapshot, qty, harga_jual_saat_itu, subtotal)"
    )
    .eq("kasir_id", kasirId)
    .eq("channel", "pos")
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  return data ?? [];
}

export async function getOnlineOrdersRingkas(filter: "pending" | "semua" = "pending") {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("orders")
    .select(
      "id, nomor_order, status_pesanan, status_pembayaran, metode_bayar, total_jual, created_at, customers(nama), guest_nama"
    )
    .eq("channel", "online")
    .order("created_at", { ascending: false })
    .limit(30);

  if (filter === "pending") {
    query = query.eq("status_pesanan", "menunggu_validasi");
  }

  const { data } = await query;
  return data ?? [];
}

export async function getOnlineOrderDetail(id: string) {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, nomor_order, status_pesanan, status_pembayaran, metode_bayar, catatan, total_jual, created_at, customers(nama, no_hp), guest_nama, guest_no_hp, metode_ambil, lokasi_lat, lokasi_lng, alamat_pengantaran, order_items(nama_produk_snapshot, qty, subtotal)"
    )
    .eq("id", id)
    .single();

  if (error || !data) throw new Error("Gagal memuat detail pesanan.");
  return data;
}