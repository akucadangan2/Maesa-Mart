// lib/types.ts
// Tipe data ini merefleksikan skema di supabase/schema.sql secara 1:1.
// Kalau ubah schema, wajib update tipe di sini juga.

export type StatusPesanan = "menunggu_validasi" | "diproses" | "selesai" | "dibatalkan";
export type StatusPembayaran = "belum_bayar" | "menunggu_konfirmasi" | "lunas";
export type MetodeBayar = "tunai" | "transfer" | "doku" | "kartu" | "ewallet";

export interface Category {
  id: string;
  nama: string;
  urutan: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  nama: string;
  deskripsi: string | null;
  satuan: string;
  harga_modal: number;
  harga_jual: number;
  diskon_persen: number;
  stok: number;
  foto_url: string | null;
  kode_barcode: string | null;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string; // sama dengan auth.users.id
  nama: string;
  no_hp: string;
  created_at: string;
}

export interface Order {
  id: string;
  nomor_order: string;
  customer_id: string | null; // isi kalau pelanggan login
  guest_nama: string | null; // isi kalau checkout sebagai tamu
  guest_no_hp: string | null; // isi kalau checkout sebagai tamu
  status_pesanan: StatusPesanan;
  status_pembayaran: StatusPembayaran;
  metode_bayar: MetodeBayar;
  metode_ambil: "ambil_sendiri" | "diantar";
  lokasi_lat: number | null;
  lokasi_lng: number | null;
  alamat_pengantaran: string | null;
  diskon_manual: number;
  detail_bayar: string | null;
  no_referensi: string | null;
  nama_pembeli_pos: string | null;
  kode_pembeli_pos: string | null;
  channel: "online" | "pos";
  kasir_id: string | null;
  bank_account_id: string | null;
  bukti_bayar_url: string | null;
  catatan: string | null;
  total_modal: number;
  total_jual: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  nama_produk_snapshot: string;
  qty: number;
  harga_modal_saat_itu: number; // SNAPSHOT, jangan pernah join ke products untuk laporan histori
  harga_jual_saat_itu: number; // SNAPSHOT
  subtotal: number;
  product_unit_id: string | null;
}

export interface DokuTransaction {
  id: string;
  order_id: string;
  doku_invoice_number: string;
  doku_ref: string | null;
  status: string;
  raw_response: Record<string, unknown> | null;
  created_at: string;
}

export interface LaporanKeuntunganHarian {
  tanggal: string;
  total_omzet: number;
  total_modal: number;
  total_laba: number;
}

export interface ProdukFavoritCustomer {
  customer_id: string;
  product_id: string;
  nama_produk_snapshot: string;
  total_qty_dibeli: number;
  jumlah_transaksi: number;
}

export interface BankAccount {
  id: string;
  nama_bank: string;
  no_rekening: string;
  atas_nama: string;
  is_aktif: boolean;
  created_at: string;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  satuan: string;
  konversi: number; // 1 satuan ini = berapa satuan eceran (products.satuan)
  kode_barcode: string | null;
  harga_beli: number;
  harga_jual: number | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  nama: string;
  alamat: string | null;
  telepon: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  supplier_id: string | null;
  no_faktur: string | null;
  total_bayar: number;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_unit_id: string | null;
  nama_produk_snapshot: string;
  satuan: string;
  harga_beli: number;
  jumlah: number;
  jumlah_dalam_eceran: number;
  total: number;
  tgl_kadaluarsa: string | null;
}

export interface Staff {
  id: string;
  nama: string;
  email: string;
  role: "super_admin" | "admin" | "kasir";
  is_aktif: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  created_at: string;
  total_pengeluaran: number;
  supplier_id: string | null;
  sumber_lainnya: string | null;
}

export interface ExpenseItem {
  id: string;
  expense_id: string;
  product_id: string | null;
  nama: string;
  satuan: string | null;
  harga: number;
  jumlah: number;
  total: number;
  foto_nota_url: string | null;
}