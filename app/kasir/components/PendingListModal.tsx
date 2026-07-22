"use client";

import { X, ListChecks, Trash2 } from "lucide-react";
import type { KasirUnitOption } from "../actions";

interface CartLine {
  product_id: string;
  nama_produk: string;
  foto_url: string | null;
  stok_tersedia_eceran: number;
  units: KasirUnitOption[];
  selectedUnitKey: string;
  qty: number;
}

interface PendingDraft {
  id: string;
  label: string;
  cart: CartLine[];
  kodePembeli: string;
  namaPembeli: string;
}

function unitKeyOf(u: KasirUnitOption) {
  return u.product_unit_id ?? "base";
}

function selectedUnit(line: CartLine): KasirUnitOption {
  return line.units.find((u) => unitKeyOf(u) === line.selectedUnitKey) ?? line.units[0];
}

export default function PendingListModal({
  pendingList,
  onClose,
  onLanjutkan,
  onHapus,
}: {
  pendingList: PendingDraft[];
  onClose: () => void;
  onLanjutkan: (draft: PendingDraft) => void;
  onHapus: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Daftar Transaksi Ditahan</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={18} />
          </button>
        </div>
        {pendingList.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6 flex flex-col items-center gap-2">
            <ListChecks size={24} className="text-gray-300" />
            Belum ada transaksi yang ditahan.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingList.map((d) => {
              const total = d.cart.reduce(
                (sum, line) => sum + selectedUnit(line).harga_jual * line.qty,
                0
              );
              return (
                <div key={d.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.label}</div>
                    <div className="text-xs text-gray-500">
                      {d.cart.length} item · Rp{total.toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onLanjutkan(d)}
                      className="text-xs bg-brand text-white rounded-lg px-3 py-1.5"
                    >
                      Lanjutkan
                    </button>
                    <button onClick={() => onHapus(d.id)} className="text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
