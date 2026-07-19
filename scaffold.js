// scaffold.js
// Jalankan: node scaffold.js
// Script ini membuat seluruh struktur folder + file starter Maesa Mart
// di dalam folder tempat script ini dijalankan.

const fs = require("fs");
const path = require("path");

const files = {
  "package.json": `{
  "name": "maesa-mart",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "recharts": "^2.12.0",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
`,

  "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,

  "next.config.mjs": `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
`,

  "tailwind.config.ts": `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#16a34a",
          dark: "#15803d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
`,

  "postcss.config.js": `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,

  ".env.example": `# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# DOKU (akun sudah verified, tinggal isi credential produksi)
DOKU_CLIENT_ID=
DOKU_SECRET_KEY=
DOKU_BASE_URL=https://api-sandbox.doku.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STORE_NAME=Maesa Mart
`,

  ".gitignore": `node_modules
.next
.env.local
.env*.local
npm-debug.log*
`,

  "middleware.ts": `import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Wajib ada supaya session login pelanggan (di /login, /akun) tetap
// ke-refresh di setiap request server-side.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
`,

  "lib/types.ts": `// lib/types.ts
// Tipe data ini merefleksikan skema di supabase/schema.sql secara 1:1.
// Kalau ubah schema, wajib update tipe di sini juga.

export type StatusPesanan = "menunggu_validasi" | "diproses" | "selesai" | "dibatalkan";
export type StatusPembayaran = "belum_bayar" | "menunggu_konfirmasi" | "lunas";
export type MetodeBayar = "tunai" | "transfer" | "doku";

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
  stok: number;
  foto_url: string | null;
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
`,

  "lib/supabase/client.ts": `// lib/supabase/client.ts
// Dipakai di Client Component ("use client"): halaman /order, /login, /daftar, /akun.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
`,

  "lib/supabase/server.ts": `// lib/supabase/server.ts
// Dipakai di Server Component / Route Handler (app/admin/**, app/akun, app/api/**).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Diabaikan kalau dipanggil dari Server Component (read-only context)
          }
        },
      },
    }
  );
}

// Khusus route yang butuh bypass RLS (webhook DOKU).
// JANGAN pernah pakai service role key ini di client-side.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
`,

  "lib/supabase/middleware.ts": `// lib/supabase/middleware.ts
// Helper dipanggil dari middleware.ts di root, supaya session login
// pelanggan ke-refresh otomatis di tiap request (pola resmi @supabase/ssr).

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}
`,

  "supabase/schema.sql": `-- supabase/schema.sql
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
`,

  "app/layout.tsx": `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maesa Mart",
  description: "Pesan sembako langsung dari toko, scan QR atau lewat link.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
`,

  "app/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;
`,

  "app/page.tsx": `import { redirect } from "next/navigation";

// Pelanggan masuk lewat scan QR statis di kasir ATAU klik link website,
// dua-duanya mengarah ke halaman yang sama: /order.
export default function Home() {
  redirect("/order");
}
`,

  "app/order/page.tsx": `import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";

// Diakses lewat 2 kanal: QR statis (ditempel di kasir) atau link website langsung.
// Keduanya membuka halaman ini, tidak ada perbedaan behavior.
//
// TODO tahap berikutnya:
// 1. State keranjang (client component terpisah)
// 2. Modal "Keranjang Pesanan": qty, catatan, metode bayar
// 3. Cek sesi login (supabase.auth.getUser()):
//    - kalau sudah login -> attach customer_id ke order, skip form nama/no_hp
//    - kalau belum login -> tampilkan pilihan "Login" / "Daftar" / "Lanjut sebagai Tamu"
//      kalau pilih tamu -> wajib isi guest_nama & guest_no_hp sebelum checkout
// 4. Submit ke Supabase: insert orders + order_items dengan snapshot harga
// 5. Kalau metode_bayar = doku -> panggil app/api/doku/create-invoice

export default async function OrderPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("urutan") as { data: Category[] | null };

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("is_aktif", true) as { data: Product[] | null };

  return (
    <main className="max-w-6xl mx-auto p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-brand">Maesa Mart</h1>
        {/* TODO: search bar, tombol keranjang, tombol riwayat, tombol login/akun */}
      </header>

      <nav className="flex gap-4 mb-6">
        {categories?.map((c) => (
          <span key={c.id} className="text-sm font-medium">
            {c.nama}
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products?.map((p) => (
          <div key={p.id} className="border rounded-lg p-3 bg-white">
            <div className="font-medium">{p.nama}</div>
            <div className="text-sm text-gray-500">{p.satuan}</div>
            <div className="text-brand font-semibold">
              Rp{p.harga_jual.toLocaleString("id-ID")}
            </div>
            {/* TODO: input qty + tombol tambah ke keranjang */}
          </div>
        ))}
      </div>
    </main>
  );
}
`,

  "app/login/page.tsx": `"use client";

// TODO: form login pelanggan (email atau no_hp + password)
// supabase.auth.signInWithPassword({ email, password })
// redirect ke /akun setelah sukses.
// Sediakan juga link "Daftar di sini" (-> /daftar) dan
// "Lanjut tanpa login" (-> /order sebagai tamu).

export default function LoginPage() {
  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Login Pelanggan</h1>
      <p className="text-sm text-gray-500">Form login akan tampil di sini.</p>
    </main>
  );
}
`,

  "app/daftar/page.tsx": `"use client";

// TODO: form daftar (nama, no_hp, email, password)
// 1. supabase.auth.signUp({ email, password })
// 2. insert row ke tabel customers: { id: user.id, nama, no_hp }
// 3. redirect ke /akun atau /order

export default function DaftarPage() {
  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Daftar Pelanggan</h1>
      <p className="text-sm text-gray-500">Form pendaftaran akan tampil di sini.</p>
    </main>
  );
}
`,

  "app/akun/page.tsx": `import { createClient } from "@/lib/supabase/server";

// TODO:
// 1. Cek auth.getUser(); kalau belum login, redirect ke /login
// 2. Fetch riwayat order where customer_id = user.id, order by created_at desc
// 3. Fetch dari view v_produk_favorit_customer where customer_id = user.id,
//    order by total_qty_dibeli desc -> tampilkan sebagai "Produk yang sering kamu beli"

export default async function AkunPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Akun Saya</h1>
      <p className="text-sm text-gray-500">
        Riwayat pesanan & produk favorit akan tampil di sini.
      </p>
    </main>
  );
}
`,

  "app/admin/layout.tsx": `// TODO: bungkus dengan pengecekan auth admin (redirect ke /admin/login kalau belum login)
// Catatan: admin login TERPISAH dari login pelanggan di /login.

const menu = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produk", label: "Produk" },
  { href: "/admin/kategori", label: "Kategori" },
  { href: "/admin/transaksi", label: "Transaksi" },
  { href: "/admin/laporan", label: "Laporan Keuntungan" },
  { href: "/admin/qr", label: "Link & QR Toko" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-900 text-white p-4 space-y-2">
        <div className="font-bold text-lg mb-4">Maesa Mart Admin</div>
        {menu.map((m) => (
          <a key={m.href} href={m.href} className="block py-2 text-sm">
            {m.label}
          </a>
        ))}
      </aside>
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
`,

  "app/admin/page.tsx": `// TODO: ringkasan hari ini - jumlah order masuk, omzet hari ini, laba hari ini
export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>
      <p className="text-sm text-gray-500">Ringkasan akan tampil di sini.</p>
    </div>
  );
}
`,

  "app/admin/produk/page.tsx": `// TODO: tabel produk (nama, kategori, harga_modal, harga_jual, stok, status)
// + form tambah/edit produk. Edit harga di sini TIDAK mengubah histori
// order_items yang sudah ada (snapshot).
export default function AdminProdukPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Produk</h1>
      <p className="text-sm text-gray-500">Tabel & form produk akan tampil di sini.</p>
    </div>
  );
}
`,

  "app/admin/kategori/page.tsx": `// TODO: CRUD kategori sederhana (nama, urutan tampil)
export default function AdminKategoriPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Kategori</h1>
      <p className="text-sm text-gray-500">Tabel & form kategori akan tampil di sini.</p>
    </div>
  );
}
`,

  "app/admin/transaksi/page.tsx": `// TODO: daftar order masuk (nomor_order, nama pelanggan/tamu, no_hp,
// status_pesanan, status_pembayaran, total_jual) + aksi validasi, tandai
// lunas, tolak/batalkan. Kalau customer_id null, tampilkan guest_nama/guest_no_hp.
export default function AdminTransaksiPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Transaksi</h1>
      <p className="text-sm text-gray-500">Daftar order masuk akan tampil di sini.</p>
    </div>
  );
}
`,

  "app/admin/laporan/page.tsx": `// TODO: fetch dari view v_laporan_keuntungan_harian lalu render grafik
// pakai recharts (line chart: tanggal vs total_laba), filter harian/bulanan,
// card total omzet/modal/laba.
// PENTING: query dari view ini (berbasis snapshot order_items),
// JANGAN hitung ulang dari harga produk saat ini.
export default function AdminLaporanPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Laporan Keuntungan</h1>
      <p className="text-sm text-gray-500">Grafik laba harian/bulanan akan tampil di sini.</p>
    </div>
  );
}
`,

  "app/admin/qr/page.tsx": `// TODO: tampilkan NEXT_PUBLIC_APP_URL + "/order" sebagai link yang bisa dicopy,
// dan generate QR code dari link tsb (pakai package "qrcode", sudah ada di
// package.json) supaya bisa didownload lalu dicetak dan ditempel di kasir.
// Dua kanal ini (QR & link) sama-sama mengarah ke halaman /order yang sama.
export default function AdminQrPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Link &amp; QR Toko</h1>
      <p className="text-sm text-gray-500">
        Link pemesanan dan QR code yang bisa dicetak akan tampil di sini.
      </p>
    </div>
  );
}
`,

  "app/api/doku/webhook/route.ts": `import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// TODO:
// 1. Verifikasi signature dari DOKU (pakai DOKU_SECRET_KEY, cocokkan header X-Signature)
// 2. Parse invoice_number / transaction_status dari payload DOKU
// 3. Update orders.status_pembayaran jadi 'lunas' kalau status SUCCESS
// 4. Simpan raw_response ke tabel doku_transactions untuk audit

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const supabase = createServiceRoleClient();

  console.log("DOKU webhook diterima:", payload);

  return NextResponse.json({ received: true });
}
`,
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
  console.log("created:", filePath);
}

console.log("\nSelesai. Langkah berikutnya:");
console.log("1. npm install");
console.log("2. copy .env.example ke .env.local, isi kredensial Supabase");
console.log("3. jalankan supabase/schema.sql di Supabase SQL Editor");
console.log("4. aktifkan Email/Phone auth provider di Supabase (untuk login pelanggan)");
console.log("5. npm run dev");
