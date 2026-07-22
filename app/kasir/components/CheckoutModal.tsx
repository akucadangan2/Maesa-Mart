"use client";

import { X } from "lucide-react";
import { METODE_BAYAR_OPTIONS } from "../metodeBayar";

export default function CheckoutModal({
  subtotal,
  totalSetelahDiskon,
  diskonManual,
  onDiskonChange,
  kodePembeli,
  onKodePembeliChange,
  namaPembeli,
  onNamaPembeliChange,
  metodeBayarId,
  onMetodeBayarChange,
  isTunai,
  uangDiterima,
  onUangDiterimaChange,
  kembalian,
  noReferensi,
  onNoReferensiChange,
  errorMsg,
  submitting,
  onSubmit,
  onClose,
}: {
  subtotal: number;
  totalSetelahDiskon: number;
  diskonManual: string;
  onDiskonChange: (v: string) => void;
  kodePembeli: string;
  onKodePembeliChange: (v: string) => void;
  namaPembeli: string;
  onNamaPembeliChange: (v: string) => void;
  metodeBayarId: string;
  onMetodeBayarChange: (v: string) => void;
  isTunai: boolean;
  uangDiterima: string;
  onUangDiterimaChange: (v: string) => void;
  kembalian: number | null;
  noReferensi: string;
  onNoReferensiChange: (v: string) => void;
  errorMsg: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Selesaikan Transaksi</h2>
            <button type="button" onClick={onClose} className="text-gray-400">
              <X size={18} />
            </button>
          </div>

          <div className="bg-brand text-white rounded-xl p-5 text-center mb-4">
            <div className="text-sm text-white/80 mb-1">Total Bayar</div>
            <div className="text-4xl font-bold font-mono">
              Rp{totalSetelahDiskon.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium block mb-1">Total Harga</label>
              <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono">
                Rp{subtotal.toLocaleString("id-ID")}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Diskon (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={diskonManual}
                onChange={(e) => onDiskonChange(e.target.value)}
                placeholder="0"
                className="border rounded-lg w-full px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Kode Pembeli (opsional)</label>
              <input
                value={kodePembeli}
                onChange={(e) => onKodePembeliChange(e.target.value)}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Nama Pembeli (opsional)</label>
              <input
                value={namaPembeli}
                onChange={(e) => onNamaPembeliChange(e.target.value)}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="text-xs font-medium block mb-1">Metode Bayar</label>
          <select
            value={metodeBayarId}
            onChange={(e) => onMetodeBayarChange(e.target.value)}
            className="border rounded-lg w-full px-3 py-2.5 text-sm bg-white mb-3"
          >
            {METODE_BAYAR_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          {isTunai ? (
            <div className="mb-3">
              <label className="text-xs font-medium block mb-1">Uang Diterima</label>
              <input
                type="text"
                inputMode="numeric"
                value={uangDiterima}
                onChange={(e) => onUangDiterimaChange(e.target.value)}
                placeholder="0"
                className="border rounded-lg w-full px-3 py-3 text-lg font-mono font-semibold"
              />
              {kembalian !== null && kembalian >= 0 && (
                <div className="mt-2 bg-brand/10 rounded-lg p-3 text-center">
                  <div className="text-xs text-brand/70">Kembalian</div>
                  <div className="text-2xl font-bold font-mono text-brand">
                    Rp{kembalian.toLocaleString("id-ID")}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-3">
              <label className="text-xs font-medium block mb-1">No Referensi (opsional)</label>
              <input
                value={noReferensi}
                onChange={(e) => onNoReferensiChange(e.target.value)}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>
          )}

          {errorMsg && <p className="text-red-500 text-xs mb-3">{errorMsg}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Memproses..." : "Selesaikan"}
          </button>
        </form>
      </div>
    </div>
  );
}
