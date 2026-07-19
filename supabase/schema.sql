-- supabase/schema.sql
-- Jalankan di Supabase SQL Editor. Aman dijalankan ulang (pakai IF NOT EXISTS).

create extension if not exists "uuid-ossp";

-- =========================================
-- 1. CATEGORIES
-- =========================================
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  nama text not null,
  urutan int not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================
-- 2. PRODUCTS
-- harga_modal & harga_jual adalah harga MASTER yang bisa diubah admin kapan saja.
-- Perubahan di sini TIDAK mengubah laporan histori (lihat order_items).
-- =========================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references categories(id) on delete restrict,
  nama text not null,
  deskripsi text,
  satuan text not null default 'pcs',
  harga_modal numeric(12,2) not null default 0,
  harga_jual numeric(12,2) not null default 0,
  stok int not null default 0,
  foto_url text,
  is_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================
-- 3. CUSTOMERS
-- Profil pelanggan terdaftar. id sama dengan auth.users.id (Supabase Auth).
-- =========================================
create table if not exists customers (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  no_hp text not null,
  created_at timestamptz not null default now()
);

-- =========================================
-- 4. ORDERS
-- Bisa dibuat oleh pelanggan terdaftar (customer_id terisi) ATAU tamu
-- (guest_nama & guest_no_hp terisi, customer_id null). Salah satu wajib ada.
-- =========================================
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  nomor_order text not null unique,
  customer_id uuid references customers(id),
  guest_nama text,
  guest_no_hp text,
  status_pesanan text not null default 'menunggu_validasi'
    check (status_pesanan in ('menunggu_validasi','diproses','selesai','dibatalkan')),
  status_pembayaran text not null default 'belum_bayar'
    check (status_pembayaran in ('belum_bayar','menunggu_konfirmasi','lunas')),
  metode_bayar text not null default 'tunai'
    check (metode_bayar in ('tunai','transfer','doku')),
  bukti_bayar_url text,
  catatan text,
  total_modal numeric(12,2) not null default 0,
  total_jual numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint chk_customer_or_guest check (
    customer_id is not null or (guest_nama is not null and guest_no_hp is not null)
  )
);

-- =========================================
-- 5. ORDER_ITEMS
-- harga_modal_saat_itu & harga_jual_saat_itu adalah SNAPSHOT dari products
-- pada saat order dibuat. Laporan keuntungan WAJIB query dari sini,
-- JANGAN join ke products untuk hitung histori.
-- =========================================
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  nama_produk_snapshot text not null,
  qty int not null check (qty > 0),
  harga_modal_saat_itu numeric(12,2) not null,
  harga_jual_saat_itu numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

-- =========================================
-- 6. DOKU_TRANSACTIONS
-- =========================================
create table if not exists doku_transactions (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  doku_invoice_number text not null,
  doku_ref text,
  status text not null default 'pending',
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_orders_created_at on orders(created_at);
create index if not exists idx_orders_customer_id on orders(customer_id);
create index if not exists idx_products_category_id on products(category_id);

-- =========================================
-- VIEW: laporan keuntungan harian (untuk /admin/laporan)
-- =========================================
create or replace view v_laporan_keuntungan_harian as
select
  date(o.created_at) as tanggal,
  sum(oi.subtotal) as total_omzet,
  sum(oi.harga_modal_saat_itu * oi.qty) as total_modal,
  sum(oi.subtotal - (oi.harga_modal_saat_itu * oi.qty)) as total_laba
from orders o
join order_items oi on oi.order_id = o.id
where o.status_pesanan <> 'dibatalkan'
group by date(o.created_at)
order by date(o.created_at) desc;

-- =========================================
-- VIEW: produk favorit per pelanggan (untuk /akun)
-- =========================================
create or replace view v_produk_favorit_customer as
select
  o.customer_id,
  oi.product_id,
  oi.nama_produk_snapshot,
  sum(oi.qty) as total_qty_dibeli,
  count(distinct o.id) as jumlah_transaksi
from orders o
join order_items oi on oi.order_id = o.id
where o.customer_id is not null
  and o.status_pesanan <> 'dibatalkan'
group by o.customer_id, oi.product_id, oi.nama_produk_snapshot;

-- =========================================
-- RLS
-- =========================================
alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table doku_transactions enable row level security;

create policy "public read categories" on categories
  for select using (true);

create policy "public read active products" on products
  for select using (is_aktif = true);

-- Customers: hanya boleh akses profil sendiri
create policy "customer view own profile" on customers
  for select using (auth.uid() = id);

create policy "customer insert own profile" on customers
  for insert with check (auth.uid() = id);

create policy "customer update own profile" on customers
  for update using (auth.uid() = id);

-- Orders: publik boleh insert (checkout tamu maupun pelanggan login sama-sama lewat sini)
create policy "public insert orders" on orders
  for insert with check (true);

-- Catatan keamanan: select order masih "true" supaya alur tamu bisa lookup
-- riwayat pakai nomor_order tanpa login (nomor_order berfungsi sebagai token).
-- Kalau volume toko sudah besar, ganti ke akses via Supabase Function/RPC
-- yang scoped, atau tambah kolom token acak terpisah dari nomor_order.
create policy "read orders by nomor_order or own customer_id" on orders
  for select using (true);

create policy "public insert order_items" on order_items
  for insert with check (true);

create policy "public read order_items" on order_items
  for select using (true);

-- Produk, kategori, dan update/delete orders hanya lewat service role key
-- di server (admin panel), sengaja tidak ada policy update/delete untuk anon.
