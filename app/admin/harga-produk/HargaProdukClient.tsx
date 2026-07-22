"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateHargaProduk } from "./actions";

interface ProductRow {
  id: string;
  nama: string;
  satuan: string;
  kode_barcode: string | null;
  harga_modal: number;
  harga_jual: number;
  diskon_persen: number;
  stok: number;
  is_aktif: boolean;
}

const STATUS_TABS = [
  { key: "aktif", label: "Aktif" },
  { key: "arsip", label: "Arsip" },
  { key: "semua", label: "Semua" },
];

export default function HargaProdukClient({
  initialProducts,
  currentStatus,
  statusCounts,
}: {
  initialProducts: ProductRow[];
  currentStatus: string;
  statusCounts: { aktif: number; arsip: number; semua: number };
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ harga_modal: 0, harga_jual: 0, diskon_persen: 0, stok: 0 });
  const [products, setProducts] = useState(initialProducts);
  const [saving, setSaving] = useState(false);

  function navigate(status: string) {
    router.push(`/admin/harga-produk?status=${status}`);
  }

  function openEdit(p: ProductRow) {
    setEditingId(p.id);
    setForm({
      harga_modal: p.harga_modal,
      harga_jual: p.harga_jual,
      diskon_persen: p.diskon_persen,
      stok: p.stok,
    });
  }

  async function handleSave() {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateHargaProduk(editingId, form);
      setProducts((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, ...form } : p))
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Harga Produk</h1>

      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
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
              {statusCounts[t.key as keyof typeof statusCounts]}
            </span>
          </button>
        ))}
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Nama</th>
            <th className="p-3">Barcode</th>
            <th className="p-3">Modal</th>
            <th className="p-3">Jual</th>
            <th className="p-3">Diskon</th>
            <th className="p-3">Stok</th>
            <th className="p-3">Status</th>
            <th className="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-4 text-center text-gray-400 italic">
                {currentStatus === "arsip" ? "Belum ada produk yang diarsipkan." : "Belum ada produk."}
              </td>
            </tr>
          ) : (
            products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.nama}</td>
                <td className="p-3 font-mono text-xs text-gray-500">{p.kode_barcode ?? "-"}</td>
                <td className="p-3">Rp{p.harga_modal.toLocaleString("id-ID")}</td>
                <td className="p-3">Rp{p.harga_jual.toLocaleString("id-ID")}</td>
                <td className="p-3">{p.diskon_persen > 0 ? `${p.diskon_persen}%` : "-"}</td>
                <td className="p-3">
                  {p.stok} {p.satuan}
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      p.is_aktif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.is_aktif ? "Aktif" : "Arsip"}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={() => openEdit(p)} className="text-brand text-xs">
                    Edit
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {editingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-3">
            <h2 className="font-bold text-lg mb-2">Edit Harga</h2>

            <div>
              <label className="text-sm font-medium block mb-1">Harga Modal</label>
              <input
                type="number"
                value={form.harga_modal}
                onChange={(e) => setForm({ ...form, harga_modal: Number(e.target.value) })}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Harga Jual</label>
              <input
                type="number"
                value={form.harga_jual}
                onChange={(e) => setForm({ ...form, harga_jual: Number(e.target.value) })}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Diskon (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.diskon_persen}
                onChange={(e) => setForm({ ...form, diskon_persen: Number(e.target.value) })}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Stok</label>
              <input
                type="number"
                value={form.stok}
                onChange={(e) => setForm({ ...form, stok: Number(e.target.value) })}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 border rounded-lg py-2 text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand text-white rounded-lg py-2 text-sm disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}