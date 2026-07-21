# Maesa Mart

Aplikasi toko sembako (grosir & eceran) full-stack: web pesan online untuk pelanggan, kasir POS untuk transaksi di toko, dan panel admin untuk kelola produk/stok/laporan.

**Live:** https://www.maesamart.my.id

## Teknologi yang Dipakai

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript |
| Database & Auth | Supabase (PostgreSQL, Authentication, Storage, Realtime) |
| Styling | Tailwind CSS |
| Hosting | Vercel |
| Payment Gateway | DOKU (Checkout API) |

Database (produk, transaksi, akun, dll) **tersimpan di Supabase**, bukan di komputer/server yang menjalankan aplikasi ini. Artinya aplikasi ini butuh koneksi internet supaya bisa membaca/menyimpan data, baik saat diakses lewat domain (`maesamart.my.id`) maupun saat dijalankan lokal di komputer manapun.

## Struktur Folder

### `app/` — Semua halaman aplikasi (Next.js App Router)

#### Untuk Pelanggan (publik, tanpa perlu login)
| Folder/File | Fungsi |
|---|---|
| `app/order/` | Halaman utama pesan online — katalog produk, keranjang, checkout. `doku-actions.ts` di dalamnya khusus mengurus pembuatan pembayaran DOKU. |
| `app/login/`, `app/daftar/` | Login dan daftar akun pelanggan. |
| `app/lupa-password/`, `app/reset-password/` | Alur lupa & reset kata sandi pelanggan. |
| `app/akun/` | Dashboard pelanggan setelah login (riwayat, produk favorit). |
| `app/riwayat/` | Cek riwayat pesanan pakai No HP (tanpa perlu login). |
| `app/cek-harga/` | Halaman publik buat komputer di tengah toko — scan/ketik barcode, langsung tampil harga semua satuan (pcs/renceng/dos). |

#### Untuk Staff Toko (perlu login)
| Folder/File | Fungsi |
|---|---|
| `app/kasir/` | Kasir POS — transaksi tunai langsung di toko, cetak struk, lihat status pesanan online. |
| `app/admin/login/` | Halaman login khusus admin & staff (terpisah dari login pelanggan). |

#### Panel Admin (`app/admin/`)
| Folder | Fungsi |
|---|---|
| `kategori/` | Kelola kategori produk. |
| `produk/` | Kelola produk lengkap (CRUD, foto, satuan besar seperti dos/renceng, arsip produk lama). |
| `harga-produk/` | Ubah harga produk saja (versi ringkas, akses lebih luas dari halaman Produk penuh). |
| `barcode/` | Cetak label barcode, mendukung printer label thermal (mode 1 label per baris atau grid multi-kolom). |
| `supplier/` | Data supplier/pemasok. |
| `pembelian/` | Input stok masuk dari supplier + riwayatnya. |
| `pengeluaran/` | Catat pengeluaran non-stok (plastik, ongkos, dll) + riwayatnya. |
| `transaksi/` | Kelola pesanan online — validasi, cek status pembayaran DOKU otomatis, info alamat pengantaran. |
| `laporan/` | Laporan keuntungan harian/bulanan (grafik). |
| `laporan-kasir/` | Rekap penjualan per kasir per rentang tanggal. |
| `pelanggan/` | Data pelanggan terdaftar — riwayat & produk favorit mereka. |
| `bank/` | Kelola rekening bank untuk (dulu) transfer manual. |
| `qr/` | Generate QR Code link toko untuk ditempel di kasir. |
| `pengguna/` | Kelola akun staff (Super Admin / Admin / Kasir) dan hak aksesnya. |

Tiap folder di atas biasanya berisi 3 jenis file:
- `page.tsx` — halaman yang dibuka browser
- `actions.ts` — fungsi yang jalan di server (query ke database, upload file, dll)
- `[Nama]Client.tsx` — bagian interaktif halaman (tombol, form, dsb)

#### File-file di root `app/`
| File | Fungsi |
|---|---|
| `layout.tsx` | Bungkus semua halaman (font, metadata). |
| `page.tsx` | Halaman root `/`, otomatis redirect ke `/order`. |
| `globals.css` | Warna, font, dan style global. |
| `api/` | API route backend, termasuk `api/doku/webhook` — penerima notifikasi pembayaran otomatis dari DOKU. |

### `lib/` — Kode yang dipakai bersama di banyak halaman
Isinya seperti: koneksi ke Supabase (browser & server), tipe data TypeScript, generator struk PDF/print, dan util kecil lainnya.

### `supabase/`
Berisi `schema.sql` — struktur database lengkap (tabel, relasi, kebijakan keamanan/RLS). Dijalankan lewat SQL Editor di dashboard Supabase.

### `public/`
Aset statis seperti logo toko yang tampil di berbagai halaman.

### File konfigurasi di root project
| File | Fungsi |
|---|---|
| `.env.example` | Contoh isian environment variable (Supabase, DOKU) — **jangan diisi kredensial asli di file ini**, isi kredensial asli hanya di `.env.local` (lokal) dan Vercel Environment Variables (production). |
| `.env.local` | Kredensial asli untuk development lokal. Tidak ikut ter-upload ke GitHub (lihat `.gitignore`). |
| `middleware.ts` | Penjaga akses halaman `/admin/**` dan `/kasir/**` sesuai role staff. |
| `tailwind.config.ts` | Warna & font tema aplikasi. |
| `package.json` | Daftar library yang dipakai. |

## Menjalankan di Komputer Sendiri (Lokal)

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Perlu isi `.env.local` dengan kredensial Supabase & DOKU (lihat `.env.example` sebagai contoh formatnya).

**Catatan penting:** menjalankan lokal tidak membuat aplikasi bisa dipakai tanpa internet. Database (Supabase) tetap berada di server terpisah, jadi tetap butuh koneksi internet aktif untuk membaca/menyimpan data produk maupun transaksi, baik dijalankan lokal maupun lewat domain resmi.

## Tingkatan Akses Staff

| Role | Akses |
|---|---|
| **Super Admin** | Semua fitur, termasuk Data User, Rekening Bank, Link & QR Toko, Laporan Keuntungan. |
| **Admin** | Kategori, Data Supplier, Harga Produk, Cetak Barcode, Pembelian, Pengeluaran, Kasir, Transaksi Online, Laporan Kasir. |
| **Kasir** | Kasir POS, dan melihat (read-only) status pembayaran pesanan online. |
