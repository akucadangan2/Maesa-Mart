"use client";

import { X, Loader2, Phone } from "lucide-react";
import type { getOnlineOrdersRingkas, getOnlineOrderDetail } from "../actions";

export default function OnlineOrdersModal({
  onlineFilter,
  onFilterChange,
  onlinePendingCount,
  onlineOrders,
  onlineLoading,
  expandedOnlineId,
  onlineDetailCache,
  loadingDetailId,
  onToggleExpand,
  onClose,
}: {
  onlineFilter: "pending" | "semua";
  onFilterChange: (f: "pending" | "semua") => void;
  onlinePendingCount: number;
  onlineOrders: Awaited<ReturnType<typeof getOnlineOrdersRingkas>>;
  onlineLoading: boolean;
  expandedOnlineId: string | null;
  onlineDetailCache: Record<string, Awaited<ReturnType<typeof getOnlineOrderDetail>>>;
  loadingDetailId: string | null;
  onToggleExpand: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3 shrink-0">
          <h2 className="font-semibold">Pesanan Online</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-5 pb-3 shrink-0">
          <button
            onClick={() => onFilterChange("pending")}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
              onlineFilter === "pending" ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600"
            }`}
          >
            Perlu Validasi {onlinePendingCount > 0 && `(${onlinePendingCount})`}
          </button>
          <button
            onClick={() => onFilterChange("semua")}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
              onlineFilter === "semua" ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600"
            }`}
          >
            Semua (30 Terbaru)
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 flex-1">
          {onlineLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-10">
              <Loader2 size={16} className="animate-spin" />
              Memuat...
            </div>
          ) : onlineOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              {onlineFilter === "pending" ? "Gak ada pesanan yang perlu divalidasi." : "Belum ada pesanan online."}
            </p>
          ) : (
            <div className="space-y-2">
              {onlineOrders.map((o: any) => {
                const isExpanded = expandedOnlineId === o.id;
                const detail = onlineDetailCache[o.id] as any;
                const isLoadingThis = loadingDetailId === o.id;

                return (
                  <div key={o.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => onToggleExpand(o.id)}
                      className="w-full flex items-center justify-between gap-2 p-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs">{o.nomor_order}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {o.customers?.nama ?? o.guest_nama ?? "Tamu"} ·{" "}
                          {new Date(o.created_at).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm">Rp{o.total_jual.toLocaleString("id-ID")}</span>
                      </div>
                    </button>

                    <div className="px-3 pb-2 flex gap-1.5">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          o.status_pembayaran === "lunas"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {o.status_pembayaran === "lunas" ? "Sudah Bayar" : "Belum/Menunggu Bayar"}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {o.status_pesanan.replace("_", " ")}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-3 space-y-2">
                        {isLoadingThis ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                            <Loader2 size={13} className="animate-spin" />
                            Memuat detail...
                          </div>
                        ) : detail ? (
                          <>
                            <div className="space-y-1">
                              {detail.order_items.map((it: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span>
                                    {it.nama_produk_snapshot} <span className="text-gray-400">x{it.qty}</span>
                                  </span>
                                  <span className="font-mono">Rp{it.subtotal.toLocaleString("id-ID")}</span>
                                </div>
                              ))}
                            </div>
                            {detail.catatan && (
                              <div className="text-xs text-gray-600 pt-1 border-t">
                                <span className="text-gray-400">Catatan: </span>
                                {detail.catatan}
                              </div>
                            )}
                            {((detail.customers as any)?.no_hp || detail.guest_no_hp) && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 pt-1 border-t">
                                <Phone size={12} />
                                {(detail.customers as any)?.no_hp ?? detail.guest_no_hp}
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
