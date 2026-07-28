"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMinimalBelanja, updateBatasQty } from "./actions";

function formatRibuan(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function parseRibuan(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

export default function PengaturanTokoClient({
  minimalBelanjaAwal,
  batasQtyKecilAwal,
  batasQtyBesarAwal,
}: {
  minimalBelanjaAwal: number;
  batasQtyKecilAwal: number;
  batasQtyBesarAwal: number;
}) {
  const router = useRouter();

  const [nilai, setNilai] = useState(formatRibuan(String(minimalBelanjaAwal)));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const [batasKecil, setBatasKecil] = useState(String(batasQtyKecilAwal || ""));
  const [batasBesar, setBatasBesar] = useState(String(batasQtyBesarAwal || ""));
  const [savingQty, setSavingQty] = useState(false);
  const [savedQtyMsg, setSavedQtyMsg] = useState(false);

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

  async function handleSaveBatasQty() {
    setSavingQty(true);
    setSavedQtyMsg(false);
    try {
      await updateBatasQty(Number(batasKecil) || 0, Number(batasBesar) || 0);
      setSavedQtyMsg(true);
      router.refresh();
      setTimeout(() => setSavedQtyMsg(false), 2500);
    } finally {
      setSavingQty(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold mb-1">Pengaturan Toko</h1>

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

      <div className="bg-white border rounded-lg p-4">
        <label className="text-sm font-medium block mb-1">Batas Maksimal Beli per Produk</label>
        <p className="text-xs text-gray-500 mb-3">
          Batesin berapa banyak 1 produk boleh dibeli pelanggan dalam 1x checkout di{" "}
          <code>/order</code>. Isi 0 kalau gak mau ada batas.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Satuan Kecil (eceran/pcs)</label>
            <input
              type="number"
              min={0}
              value={batasKecil}
              onChange={(e) => setBatasKecil(e.target.value)}
              placeholder="0 = tanpa batas"
              className="border rounded-lg w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Satuan Besar (DOS/PAK/dll)</label>
            <input
              type="number"
              min={0}
              value={batasBesar}
              onChange={(e) => setBatasBesar(e.target.value)}
              placeholder="0 = tanpa batas"
              className="border rounded-lg w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleSaveBatasQty}
          disabled={savingQty}
          className="bg-brand text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {savingQty ? "Menyimpan..." : "Simpan"}
        </button>
        {savedQtyMsg && <span className="text-xs text-brand ml-3">Tersimpan ✓</span>}
      </div>
    </div>
  );
}