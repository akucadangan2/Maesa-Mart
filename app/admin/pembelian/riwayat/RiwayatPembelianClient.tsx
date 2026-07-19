"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getPurchaseDetail } from "./actions";

interface PurchaseListRow {
  id: string;
  no_faktur: string | null;
  total_bayar: number;
  created_at: string;
  suppliers: { nama: string } | null;
  purchase_items: { id: string }[];
}

interface PurchaseDetail extends PurchaseListRow {
  purchase_items: {
    id: string;
    nama_produk_snapshot: string;
    satuan: string;
    harga_beli: number;
    jumlah: number;
    total: number;
    tgl_kadaluarsa: string | null;
  }[];
}

export default function RiwayatPembelianClient({ purchases }: { purchases: PurchaseListRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, PurchaseDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      setLoadingId(id);
      try {
        const detail = (await getPurchaseDetail(id)) as PurchaseDetail;
        setDetailCache((prev) => ({ ...prev, [id]: detail }));
      } finally {
        setLoadingId(null);
      }
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Data Pembelian</h1>

      {purchases.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">Belum ada transaksi pembelian.</p>
      )}

      <div className="space-y-2">
        {purchases.map((p) => {
          const isExpanded = expandedId === p.id;
          const detail = detailCache[p.id];
          const isLoading = loadingId === p.id;

          return (
            <div key={p.id} className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleExpand(p.id)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium">{p.suppliers?.nama ?? "-"}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleDateString("id-ID")}
                    {p.no_faktur && ` · Faktur: ${p.no_faktur}`} · {p.purchase_items.length} item
                  </div>
                </div>
                <span className="font-semibold text-sm">
                  Rp{p.total_bayar.toLocaleString("id-ID")}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t p-4 overflow-x-auto">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <Loader2 size={15} className="animate-spin" />
                      Memuat detail...
                    </div>
                  )}
                  {detail && (
                    <table className="w-full text-sm min-w-[500px]">
                      <thead className="text-left text-gray-500">
                        <tr>
                          <th className="pb-2">Produk</th>
                          <th className="pb-2">Satuan</th>
                          <th className="pb-2">Harga</th>
                          <th className="pb-2">Jumlah</th>
                          <th className="pb-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.purchase_items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="py-1.5">{item.nama_produk_snapshot}</td>
                            <td className="py-1.5">{item.satuan}</td>
                            <td className="py-1.5">Rp{item.harga_beli.toLocaleString("id-ID")}</td>
                            <td className="py-1.5">{item.jumlah}</td>
                            <td className="py-1.5">Rp{item.total.toLocaleString("id-ID")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}