"use client";

import { X, Printer } from "lucide-react";
import { downloadStruk } from "@/lib/strukGenerator";

export default function RiwayatModal({
  riwayat,
  staffNama,
  onClose,
}: {
  riwayat: any[];
  staffNama: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Riwayat Hari Ini</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={18} />
          </button>
        </div>
        {riwayat.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Belum ada transaksi hari ini.</p>
        ) : (
          <div className="space-y-2">
            {riwayat.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs">{r.nomor_order}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleTimeString("id-ID")} · {r.metode_bayar}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">Rp{r.total_jual.toLocaleString("id-ID")}</span>
                  <button
                    onClick={() =>
                      downloadStruk({
                        nomor_order: r.nomor_order,
                        created_at: r.created_at,
                        metode_bayar: r.metode_bayar,
                        status_pesanan: "selesai",
                        total_jual: r.total_jual,
                        kasir_nama: staffNama,
                        nama_pembeli: r.nama_pembeli_pos ?? r.nama_pembeli,
                        detail_bayar: r.detail_bayar,
                        no_referensi: r.no_referensi,
                        items: (r.order_items ?? []).map((it: any) => ({
                          nama: it.nama_produk_snapshot,
                          qty: it.qty,
                          harga_satuan: it.harga_jual_saat_itu,
                          subtotal: it.subtotal,
                        })),
                      })
                    }
                    className="text-brand"
                    aria-label="Cetak ulang struk"
                  >
                    <Printer size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
