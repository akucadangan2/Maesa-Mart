"use client";

import { useRouter } from "next/navigation";
import { LogOut, Download, Package, Award, Phone, ChevronLeft, ChevronRight, ShoppingBasket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { downloadStruk } from "@/lib/strukGenerator";
import type { Customer, Order, OrderItem, ProdukFavoritCustomer } from "@/lib/types";

type OrderWithItems = Order & { order_items: OrderItem[] };

const labelPesanan: Record<string, string> = {
  menunggu_validasi: "Menunggu Validasi",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const badgePesanan: Record<string, string> = {
  menunggu_validasi: "bg-blue-100 text-blue-700",
  diproses: "bg-yellow-100 text-yellow-700",
  selesai: "bg-green-100 text-green-700",
  dibatalkan: "bg-red-100 text-red-700",
};

export default function AkunClient({
  customer,
  orders,
  favorit,
  totalCount,
  pageSize,
  currentPage,
}: {
  customer: Customer;
  orders: OrderWithItems[];
  favorit: ProdukFavoritCustomer[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/order");
    router.refresh();
  }

  function navigate(page: number) {
    router.push(`/akun?page=${page}`);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const totalPoin = (customer as any).total_poin ?? 0;

  return (
    <main className="min-h-screen max-w-lg mx-auto px-4 pb-16">
    <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-line flex items-center justify-between py-4">
        <h1 className="font-display text-xl font-semibold">Halo, {customer.nama}</h1>
        <div className="flex items-center gap-2 shrink-0">
          
            href="/order"
            className="flex items-center gap-1.5 text-xs text-brand border border-brand rounded-full px-3 py-1.5"
          >
            <ShoppingBasket size={13} />
            Belanja
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-ink-soft border border-line rounded-full px-3 py-1.5"
          >
            <LogOut size={13} />
            Keluar
          </button>
        </div>
      </header>

      {/* ===== Kartu Member ===== */}
      <div className="mt-4 mb-6 rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-white/80 tracking-wide">MAESA MART MEMBER</span>
          <Award size={20} className="text-white/80" />
        </div>
        <div className="text-lg font-semibold mb-1">{customer.nama}</div>
        <div className="flex items-center gap-1.5 text-xs text-white/80 mb-4">
          <Phone size={12} />
          {customer.no_hp}
        </div>
        <div>
          <div className="text-xs text-white/70 mb-0.5">Total Poin</div>
          <div className="text-3xl font-bold font-mono">{totalPoin.toLocaleString("id-ID")}</div>
        </div>
      </div>

      {favorit.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium mb-2">Sering kamu beli</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {favorit.map((f) => (
              <div
                key={f.product_id}
                className="shrink-0 bg-surface border border-line rounded-xl px-3 py-2 min-w-[140px]"
              >
                <div className="text-sm font-medium truncate">{f.nama_produk_snapshot}</div>
                <div className="text-xs text-ink-soft">
                  {f.total_qty_dibeli}x dibeli · {f.jumlah_transaksi} transaksi
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Riwayat Pesanan</h2>
          {totalCount > 0 && <span className="text-xs text-ink-soft">{totalCount} pesanan</span>}
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-10">
            <Package className="mx-auto mb-2 text-ink-soft" size={32} />
            <p className="text-sm text-ink-soft mb-2">Belum ada pesanan.</p>
            <a href="/order" className="text-brand text-sm underline">
              Mulai belanja
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="bg-surface border border-line rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium">{o.nomor_order}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${badgePesanan[o.status_pesanan]}`}>
                      {labelPesanan[o.status_pesanan]}
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft mb-3">
                    {new Date(o.created_at).toLocaleString("id-ID")}
                  </div>
                  <div className="space-y-1 mb-3">
                    {o.order_items.map((it) => (
                      <div key={it.id} className="flex justify-between text-sm">
                        <span>
                          {it.nama_produk_snapshot} <span className="text-ink-soft">x{it.qty}</span>
                        </span>
                        <span className="font-mono">Rp{it.subtotal.toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-line mb-3">
                    <span>Total</span>
                    <span className="font-mono">Rp{o.total_jual.toLocaleString("id-ID")}</span>
                  </div>
                  <button
                    onClick={() =>
                      downloadStruk({
                        nomor_order: o.nomor_order,
                        created_at: o.created_at,
                        metode_bayar: o.metode_bayar,
                        status_pesanan: o.status_pesanan,
                        total_jual: o.total_jual,
                        items: o.order_items.map((it) => ({
                          nama: it.nama_produk_snapshot,
                          qty: it.qty,
                          subtotal: it.subtotal,
                        })),
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 border border-line rounded-xl py-2 text-xs font-medium text-ink-soft hover:bg-bg"
                  >
                    <Download size={14} />
                    Download Struk
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => navigate(currentPage - 1)}
                  className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-line disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Sebelumnya
                </button>
                <span className="text-xs text-ink-soft">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => navigate(currentPage + 1)}
                  className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-line disabled:opacity-40"
                >
                  Berikutnya <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}