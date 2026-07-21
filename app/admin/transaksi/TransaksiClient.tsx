"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { StatusPesanan, StatusPembayaran } from "@/lib/types";
import { updateStatusPesanan, updateStatusPembayaran, getOrderDetail } from "./actions";
import { syncDokuPaymentStatus } from "@/app/order/doku-actions";

interface OrderListRow {
  id: string;
  nomor_order: string;
  customer_id: string | null;
  guest_nama: string | null;
  guest_no_hp: string | null;
  status_pesanan: StatusPesanan;
  status_pembayaran: StatusPembayaran;
  metode_bayar: string;
  total_jual: number;
  created_at: string;
  customers: { nama: string } | null;
}

interface OrderDetail extends OrderListRow {
  catatan: string | null;
  bukti_bayar_url: string | null;
  order_items: { id: string; nama_produk_snapshot: string; qty: number; subtotal: number }[];
  bank_accounts: { nama_bank: string; no_rekening: string; atas_nama: string } | null;
  metode_ambil: "ambil_sendiri" | "diantar";
  lokasi_lat: number | null;
  lokasi_lng: number | null;
  alamat_pengantaran: string | null;
}

const labelPesanan: Record<string, string> = {
  menunggu_validasi: "Menunggu Validasi",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const labelPembayaran: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  menunggu_konfirmasi: "Menunggu Konfirmasi",
  lunas: "Lunas",
};

const badgePesanan: Record<string, string> = {
  menunggu_validasi: "bg-blue-100 text-blue-700",
  diproses: "bg-yellow-100 text-yellow-700",
  selesai: "bg-green-100 text-green-700",
  dibatalkan: "bg-red-100 text-red-700",
};

const badgePembayaran: Record<string, string> = {
  belum_bayar: "bg-gray-100 text-gray-600",
  menunggu_konfirmasi: "bg-yellow-100 text-yellow-700",
  lunas: "bg-green-100 text-green-700",
};

const TABS = [
  { key: "menunggu_validasi", label: "Menunggu Validasi" },
  { key: "diproses", label: "Diproses" },
  { key: "selesai", label: "Selesai" },
  { key: "dibatalkan", label: "Dibatalkan" },
  { key: "semua", label: "Semua" },
];

export default function TransaksiClient({
  orders,
  totalCount,
  pageSize,
  currentPage,
  currentStatus,
  currentQuery,
  currentMetode,
  statusCounts,
  metodeCounts,
}: {
  orders: OrderListRow[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  currentStatus: string;
  currentQuery: string;
  currentMetode: string;
  statusCounts: Record<string, number>;
  metodeCounts: { doku: number; manual: number };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(currentQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, OrderDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [syncingDokuId, setSyncingDokuId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== currentQuery) {
        navigate({ status: currentStatus, page: 1, q: searchInput });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function navigate(opts: { status: string; page: number; q: string; size?: number; metode?: string }) {
    const sp = new URLSearchParams();
    sp.set("status", opts.status);
    sp.set("page", String(opts.page));
    sp.set("size", String(opts.size ?? pageSize));
    sp.set("metode", opts.metode ?? currentMetode);
    if (opts.q) sp.set("q", opts.q);
    router.push(`/admin/transaksi?${sp.toString()}`);
  }

  async function handleSyncDoku(id: string, manual: boolean) {
    setSyncingDokuId(id);
    try {
      const result = await syncDokuPaymentStatus(id);
      if (result.updated) {
        setDetailCache((prev) => {
          if (!prev[id]) return prev;
          return { ...prev, [id]: { ...prev[id], status_pembayaran: "lunas" } };
        });
        router.refresh();
      } else if (manual) {
        alert(`Status di DOKU: ${result.status}. Belum berubah jadi lunas.`);
      }
    } catch (err) {
      if (manual) {
        alert(err instanceof Error ? err.message : "Gagal cek status DOKU");
      }
    } finally {
      setSyncingDokuId(null);
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      setLoadingDetailId(id);
      try {
        const detail = (await getOrderDetail(id)) as OrderDetail;
        setDetailCache((prev) => ({ ...prev, [id]: detail }));

        // Pesanan DOKU yang belum lunas, otomatis dicek di belakang layar,
        // gak perlu klik manual. Gak dijalanin kalau lagi di tab Tunai/Transfer
        // (mustahil ada order DOKU di situ, jadi gak perlu buang request).
        if (
          detail.metode_bayar === "doku" &&
          detail.status_pembayaran !== "lunas" &&
          currentMetode !== "manual"
        ) {
          handleSyncDoku(id, false);
        }
      } finally {
        setLoadingDetailId(null);
      }
    }
  }

  function handlePesanan(id: string, status: StatusPesanan) {
    // Update state cache lokal agar UI modal detail langsung berubah
    setDetailCache((prev) => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], status_pesanan: status } };
    });

    startTransition(async () => {
      await updateStatusPesanan(id, status);
      router.refresh();
    });
  }

  function handlePembayaran(id: string, status: StatusPembayaran) {
    // Update state cache lokal agar UI modal detail langsung berubah
    setDetailCache((prev) => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], status_pembayaran: status } };
    });

    startTransition(async () => {
      await updateStatusPembayaran(id, status);
      router.refresh();
    });
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Transaksi</h1>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => navigate({ status: currentStatus, page: 1, q: currentQuery, metode: "semua" })}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
            currentMetode === "semua"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          Semua Metode
        </button>
        <button
          onClick={() => navigate({ status: currentStatus, page: 1, q: currentQuery, metode: "doku" })}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
            currentMetode === "doku"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          DOKU (Auto Bayar) · {metodeCounts.doku}
        </button>
        <button
          onClick={() => navigate({ status: currentStatus, page: 1, q: currentQuery, metode: "manual" })}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
            currentMetode === "manual"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          Tunai/Transfer · {metodeCounts.manual}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate({ status: t.key, page: 1, q: currentQuery })}
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
              currentStatus === t.key
                ? "bg-brand text-white border-brand"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            {t.label}
            <span
              className={`text-[11px] px-1.5 rounded-full ${
                currentStatus === t.key ? "bg-white/20" : "bg-gray-100"
              }`}
            >
              {statusCounts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nomor pesanan / nama / no HP..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          />
        </div>
        <select
          value={pageSize}
          onChange={(e) =>
            navigate({ status: currentStatus, page: 1, q: currentQuery, size: Number(e.target.value) })
          }
          className="border border-gray-200 rounded-lg px-2 text-sm bg-white"
        >
          <option value={10}>10 / halaman</option>
          <option value={20}>20 / halaman</option>
          <option value={50}>50 / halaman</option>
        </select>
      </div>

      {orders.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">Tidak ada pesanan di sini.</p>
      )}

      <div className="space-y-2">
        {orders.map((order) => {
          const nama = order.customers?.nama ?? order.guest_nama ?? "-";
          const noHp = order.guest_no_hp ?? "-";
          const isExpanded = expandedId === order.id;
          const detail = detailCache[order.id];
          const isLoadingThis = loadingDetailId === order.id;

          return (
            <div key={order.id} className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleExpand(order.id)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm font-medium truncate">{order.nomor_order}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {nama} · {noHp} · {new Date(order.created_at).toLocaleDateString("id-ID")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden sm:inline text-xs px-2 py-1 rounded-full ${badgePesanan[order.status_pesanan]}`}>
                    {labelPesanan[order.status_pesanan]}
                  </span>
                  <span className="font-semibold text-sm">
                    Rp{order.total_jual.toLocaleString("id-ID")}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-4">
                  {isLoadingThis && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <Loader2 size={15} className="animate-spin" />
                      Memuat detail...
                    </div>
                  )}

                  {detail && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 sm:hidden">
                        <span className={`text-xs px-2 py-1 rounded-full ${badgePesanan[detail.status_pesanan]}`}>
                          {labelPesanan[detail.status_pesanan]}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${badgePembayaran[detail.status_pembayaran]}`}>
                          {labelPembayaran[detail.status_pembayaran]}
                        </span>
                      </div>

                      <table className="w-full text-sm">
                        <tbody>
                          {detail.order_items.map((item) => (
                            <tr key={item.id} className="border-b last:border-0">
                              <td className="py-1">{item.nama_produk_snapshot}</td>
                              <td className="py-1 text-gray-500">x{item.qty}</td>
                              <td className="py-1 text-right">
                                Rp{item.subtotal.toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {detail.catatan && (
                        <div className="text-sm">
                          <span className="text-gray-500">Catatan: </span>
                          {detail.catatan}
                        </div>
                      )}

                      {detail.metode_ambil === "diantar" && (
                        <div className="text-sm bg-orange-50 border border-orange-100 rounded-lg p-3">
                          <div className="font-medium text-orange-700 mb-1">🛵 Minta Diantar</div>
                          {detail.alamat_pengantaran && <div>{detail.alamat_pengantaran}</div>}
                          {detail.lokasi_lat && detail.lokasi_lng && (
                            <a
                              href={`https://www.google.com/maps?q=${detail.lokasi_lat},${detail.lokasi_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand underline text-xs block mt-1"
                            >
                              Buka lokasi di Google Maps
                            </a>
                          )}
                        </div>
                      )}

                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span>
                          Metode bayar: <span className="font-medium">{detail.metode_bayar}</span>
                          {detail.bank_accounts && (
                            <span>
                              {" "}
                              · {detail.bank_accounts.nama_bank} {detail.bank_accounts.no_rekening}
                            </span>
                          )}
                        </span>
                        {detail.metode_bayar === "doku" && syncingDokuId === order.id && (
                          <span className="flex items-center gap-1 text-xs text-brand">
                            <Loader2 size={11} className="animate-spin" />
                            Cek status DOKU...
                          </span>
                        )}
                      </div>

                      {detail.bukti_bayar_url && (
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">Bukti Transfer:</span>
                          <a href={detail.bukti_bayar_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={detail.bukti_bayar_url}
                              alt="Bukti transfer"
                              className="w-28 h-28 object-cover rounded border"
                            />
                          </a>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {detail.status_pesanan === "menunggu_validasi" && (
                          <button
                            disabled={isPending}
                            onClick={() => handlePesanan(order.id, "diproses")}
                            className="bg-brand text-white text-xs px-3 py-1.5 rounded-lg"
                          >
                            Validasi Pesanan
                          </button>
                        )}
                        {detail.status_pesanan === "diproses" && (
                          <button
                            disabled={isPending}
                            onClick={() => handlePesanan(order.id, "selesai")}
                            className="bg-brand text-white text-xs px-3 py-1.5 rounded-lg"
                          >
                            Tandai Selesai
                          </button>
                        )}
                        {detail.status_pesanan !== "dibatalkan" && detail.status_pesanan !== "selesai" && (
                          <button
                            disabled={isPending}
                            onClick={() => handlePesanan(order.id, "dibatalkan")}
                            className="border border-red-300 text-red-600 text-xs px-3 py-1.5 rounded-lg"
                          >
                            Batalkan
                          </button>
                        )}
                        {detail.metode_bayar === "doku" && detail.status_pembayaran !== "lunas" && (
                          <button
                            disabled={syncingDokuId === order.id}
                            onClick={() => handleSyncDoku(order.id, true)}
                            className="border border-brand text-brand text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            {syncingDokuId === order.id ? "Mengecek..." : "Cek Ulang Status"}
                          </button>
                        )}
                        {detail.status_pembayaran !== "lunas" && (
                          <button
                            disabled={isPending}
                            onClick={() => handlePembayaran(order.id, "lunas")}
                            className="border text-xs px-3 py-1.5 rounded-lg"
                          >
                            Tandai Lunas
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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
            onClick={() => navigate({ status: currentStatus, page: currentPage - 1, q: currentQuery })}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Sebelumnya
          </button>
          <span className="text-sm text-gray-500">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => navigate({ status: currentStatus, page: currentPage + 1, q: currentQuery })}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            Berikutnya <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}