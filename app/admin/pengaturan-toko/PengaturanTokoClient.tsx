"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMinimalBelanja } from "./actions";

function formatRibuan(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function parseRibuan(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

export default function PengaturanTokoClient({ minimalBelanjaAwal }: { minimalBelanjaAwal: number }) {
  const router = useRouter();
  const [nilai, setNilai] = useState(formatRibuan(String(minimalBelanjaAwal)));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSavedMsg(false);
    try {
      await updateMinimalBelanja(parseRibuan(nilai));
      setSavedMsg(true);
      router.refresh();
      setTimeout(() => setSavedMsg(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold mb-4">Pengaturan Toko</h1>

      <div className="bg-white border rounded-lg p-4">
        <label className="text-sm font-medium block mb-1">Minimal Belanja Pesan Online (Rp)</label>
        <p className="text-xs text-gray-500 mb-2">
          Pelanggan gak bisa checkout di halaman pesan online kalau total belanjanya di bawah angka
          ini. Isi 0 kalau gak mau ada batas minimal.
        </p>
        <input
          type="text"
          inputMode="numeric"
          value={nilai}
          onChange={(e) => setNilai(formatRibuan(e.target.value))}
          className="border rounded-lg w-full px-3 py-2 text-sm font-mono mb-3"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {savedMsg && <span className="text-xs text-brand ml-3">Tersimpan ✓</span>}
      </div>
    </div>
  );
}