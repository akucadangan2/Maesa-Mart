"use client";

import { X, Award, UserCheck } from "lucide-react";
import { METODE_BAYAR_OPTIONS } from "../metodeBayar";
import type { MemberResult } from "../membershipActions";

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
  memberQuery,
  onMemberQueryChange,
  memberResults,
  selectedMember,
  onSelectMember,
  diskonMembership,
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
  memberQuery: string;
  onMemberQueryChange: (v: string) => void;
  memberResults: MemberResult[];
  selectedMember: MemberResult | null;
  onSelectMember: (m: MemberResult | null) => void;
  diskonMembership: number;
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
            {diskonMembership > 0 && (
              <div className="text-xs text-white/80 mt-1">
                (sudah termasuk diskon member -Rp{diskonMembership.toLocaleString("id-ID")})
              </div>
            )}
          </div>

          {/* ===== Member (Opsional) ===== */}
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1">Member (Opsional)</label>
            {selectedMember ? (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck size={16} className="text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{selectedMember.nama}</div>
                    <div className="text-xs text-gray-500">
                      {selectedMember.no_hp} ·{" "}
                      <span className="text-amber-700 font-medium">
                        {selectedMember.total_poin.toLocaleString("id-ID")} poin
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectMember(null)}
                  className="text-xs text-red-500 shrink-0 ml-2"
                >
                  Hapus
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={memberQuery}
                  onChange={(e) => onMemberQueryChange(e.target.value)}
                  placeholder="Cari No HP atau Nama member..."
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                />
                {memberQuery.trim() && memberResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {memberResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectMember(m)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 border-b last:border-0"
                      >
                        <div>
                          <div className="font-medium">{m.nama}</div>
                          <div className="text-xs text-gray-500">{m.no_hp}</div>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium shrink-0">
                          <Award size={12} />
                          {m.total_poin}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {memberQuery.trim() && memberResults.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Member gak ditemukan.</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium block mb-1">Total Harga</label>
              <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono">
                Rp{subtotal.toLocaleString("id-ID")}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Diskon Manual (Rp)</label>
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