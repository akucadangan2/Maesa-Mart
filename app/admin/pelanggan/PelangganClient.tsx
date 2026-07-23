"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Loader2, User, Award } from "lucide-react";
import { getCustomerDetail } from "./actions";

interface CustomerRow {
  customer_id: string;
  nama: string;
  no_hp: string;
  created_at: string;
  jumlah_transaksi: number;
  total_belanja: number;
  total_poin: number;
}

const statusLabel: Record<string, string> = {
  menunggu_validasi: "Menunggu Validasi",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default function PelangganClient({
  customers,
  totalCount,
  pageSize,
  currentPage,
  currentQuery,
}: {
  customers: CustomerRow[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  currentQuery: string;
}) {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState(currentQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, Awaited<ReturnType<typeof getCustomerDetail>>>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== currentQuery) {
        navigate({ page: 1, q: searchInput, size: pageSize });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function navigate(opts: { page: number; q: string; size: number }) {
    const sp = new URLSearchParams();
    sp.set("page", String(opts.page));
    sp.set("size", String(opts.size));
    if (opts.q) sp.set("q", opts.q);
    router.push(`/admin/pelanggan?${sp.toString()}`);
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      setLoadingId(id);
      try {
        const detail = await getCustomerDetail(id);
        setDetailCache((prev) => ({ ...prev, [id]: detail }));
      } finally {
        setLoadingId(null);
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">Data Membership</h1>
        <a href="/admin/pengaturan-membership" className="text-sm text-brand hover:underline">
          Pengaturan Membership →
        </a>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Pelanggan yang sudah daftar akun & login otomatis jadi member (bukan pembeli tamu/kasir).
      </p>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama / no HP..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          />
        </div>
        <select
          value={pageSize}
          onChange={(e) => navigate({ page: 1, q: currentQuery, size: Number(e.target.value) })}
          className="border border-gray-200 rounded-lg px-2 text-sm bg-white"
        >
          <option value={10}>10 / halaman</option>
          <option value={20}>20 / halaman</option>
          <option value={50}>50 / halaman</option>
        </select>
      </div>

      {customers.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">Belum ada member terdaftar.</p>
      )}

      <div className="space-y-2">
        {customers.map((c) => {
          const isExpanded = expandedId === c.customer_id;
          const detail = detailCache[c.customer_id];
          const isLoadingThis = loadingId === c.customer_id;

          return (
            <div key={c.customer_id} className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleExpand(c.customer_id)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.nama}</div>
                    <div className="text-xs text-gray-500">
                      {c.no_hp} · daftar {new Date(c.created_at).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end text-xs font-medium text-amber-600 mb-0.5">
                    <Award size={13} />
                    {c.total_poin.toLocaleString("id-ID")} poin
                  </div>
                  <div className="font-semibold text-sm">Rp{c.total_belanja.toLocaleString("id-ID")}</div>
                  <div className="text-xs text-gray-500">{c.jumlah_transaksi} transaksi</div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-4">
                  {isLoadingThis ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <Loader2 size={15} className="animate-spin" />
                      Memuat detail...
                    </div>
                  ) : detail ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Produk Sering Dibeli</p>
                        {detail.favorit.length === 0 ? (
                          <p className="text-xs text-gray-400">Belum ada data.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {detail.favorit.map((f: any) => (
                              <div key={f.product_id} className="flex justify-between text-xs">
                                <span className="truncate">{f.nama_produk_snapshot}</span>
                                <span className="text-gray-500 shrink-0 ml-2">
                                  {f.total_qty_dibeli}x
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Riwayat Pesanan Terbaru</p>
                        {detail.orders.length === 0 ? (
                          <p className="text-xs text-gray-400">Belum ada pesanan.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {detail.orders.map((o: any) => (
                              <div key={o.id} className="flex justify-between text-xs">
                                <span className="font-mono text-gray-600">{o.nomor_order}</span>
                                <span className="text-gray-500 shrink-0 ml-2">
                                  Rp{o.total_jual.toLocaleString("id-ID")} ·{" "}
                                  {statusLabel[o.status_pesanan] ?? o.status_pesanan}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Riwayat Poin</p>
                        {detail.poinLog.length === 0 ? (
                          <p className="text-xs text-gray-400">Belum ada poin diperoleh.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {detail.poinLog.map((p: any) => (
                              <div key={p.id} className="flex justify-between text-xs">
                                <span className="text-gray-600 truncate">
                                  {p.keterangan ?? new Date(p.created_at).toLocaleDateString("id-ID")}
                                </span>
                                <span className="text-amber-600 font-medium shrink-0 ml-2">
                                  +{p.poin_diperoleh}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={currentPage <= 1}
            onClick={() => navigate({ page: currentPage - 1, q: currentQuery, size: pageSize })}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Sebelumnya
          </button>
          <span className="text-sm text-gray-500">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => navigate({ page: currentPage + 1, q: currentQuery, size: pageSize })}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            Berikutnya <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}