"use client";

import { useState } from "react";
import type { Category, Product, ProductUnit } from "@/lib/types";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductUnits,
  createProductUnit,
  deleteProductUnit,
} from "./actions";

function hargaEfektif(p: Product) {
  return p.diskon_persen > 0
    ? Math.round(p.harga_jual * (1 - p.diskon_persen / 100))
    : p.harga_jual;
}

export default function ProdukClient({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [unitErrorMsg, setUnitErrorMsg] = useState<string | null>(null);
  const [unitSaving, setUnitSaving] = useState(false);

  // Input satuan besar dikontrol lewat state (bukan <form> tersendiri),
  // supaya gak ada form nested di dalam form utama (itu penyebab bug
  // "+ Tambah" kemarin gak nyimpen apa-apa).
  const [unitSatuan, setUnitSatuan] = useState("");
  const [unitKonversi, setUnitKonversi] = useState("");
  const [unitBarcode, setUnitBarcode] = useState("");
  const [unitHargaBeli, setUnitHargaBeli] = useState("");
  const [unitHargaJual, setUnitHargaJual] = useState("");

  function resetUnitForm() {
    setUnitSatuan("");
    setUnitKonversi("");
    setUnitBarcode("");
    setUnitHargaBeli("");
    setUnitHargaJual("");
    setUnitErrorMsg(null);
  }

  function openTambah() {
    setEditing(null);
    setErrorMsg(null);
    setUnits([]);
    setUnitFormOpen(false);
    resetUnitForm();
    setFormOpen(true);
  }

  async function openEdit(product: Product) {
    setEditing(product);
    setErrorMsg(null);
    setUnitFormOpen(false);
    resetUnitForm();
    setFormOpen(true);
    setLoadingUnits(true);
    try {
      const data = await getProductUnits(product.id);
      setUnits(data as ProductUnit[]);
    } finally {
      setLoadingUnits(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateProduct(editing.id, formData);
      } else {
        await createProduct(formData);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }

  function handleDelete(product: Product) {
    if (!confirm(`Hapus produk "${product.nama}"?`)) return;
    setIsPending(true);
    deleteProduct(product.id).finally(() => setIsPending(false));
  }

  async function handleAddUnit() {
    if (!editing) return;
    setUnitErrorMsg(null);

    if (!unitSatuan.trim() || !unitKonversi || !unitHargaBeli) {
      setUnitErrorMsg("Nama satuan, Isi, dan Harga Beli wajib diisi.");
      return;
    }

    setUnitSaving(true);
    try {
      const formData = new FormData();
      formData.set("satuan", unitSatuan.trim());
      formData.set("konversi", unitKonversi);
      formData.set("kode_barcode", unitBarcode.trim());
      formData.set("harga_beli", unitHargaBeli);
      formData.set("harga_jual", unitHargaJual);

      await createProductUnit(editing.id, formData);
      const data = await getProductUnits(editing.id);
      setUnits(data as ProductUnit[]);
      setUnitFormOpen(false);
      resetUnitForm();
    } catch (err) {
      setUnitErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUnitSaving(false);
    }
  }

  async function handleDeleteUnit(unitId: string) {
    if (!confirm("Hapus satuan ini?")) return;
    await deleteProductUnit(unitId);
    if (editing) {
      const data = await getProductUnits(editing.id);
      setUnits(data as ProductUnit[]);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Produk</h1>
        <button onClick={openTambah} className="bg-brand text-white rounded-lg px-4 py-2 text-sm">
          + Tambah Produk
        </button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Foto</th>
            <th className="p-3">Nama</th>
            <th className="p-3">Barcode</th>
            <th className="p-3">Kategori</th>
            <th className="p-3">Modal</th>
            <th className="p-3">Jual</th>
            <th className="p-3">Diskon</th>
            <th className="p-3">Stok</th>
            <th className="p-3">Status</th>
            <th className="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {initialProducts.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nama} className="w-12 h-12 object-cover rounded" />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded" />
                )}
              </td>
              <td className="p-3">{p.nama}</td>
              <td className="p-3 font-mono text-xs text-gray-500">{p.kode_barcode ?? "-"}</td>
              <td className="p-3">{categories.find((c) => c.id === p.category_id)?.nama ?? "-"}</td>
              <td className="p-3">Rp{p.harga_modal.toLocaleString("id-ID")}</td>
              <td className="p-3">
                Rp{p.harga_jual.toLocaleString("id-ID")}
                {p.diskon_persen > 0 && (
                  <div className="text-xs text-brand">
                    jadi Rp{hargaEfektif(p).toLocaleString("id-ID")}
                  </div>
                )}
              </td>
              <td className="p-3">
                {p.diskon_persen > 0 ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                    -{p.diskon_persen}%
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
              <td className="p-3">{p.stok}</td>
              <td className="p-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    p.is_aktif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.is_aktif ? "Aktif" : "Nonaktif"}
                </span>
              </td>
              <td className="p-3 space-x-2">
                <button onClick={() => openEdit(p)} className="text-brand text-xs">
                  Edit
                </button>
                <button onClick={() => handleDelete(p)} disabled={isPending} className="text-red-500 text-xs">
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg">{editing ? "Edit Produk" : "Tambah Produk"}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            {/* Form utama produk. Ini SATU-SATUNYA <form> di modal ini. */}
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Kategori</label>
                <select
                  name="category_id"
                  defaultValue={editing?.category_id ?? categories[0]?.id}
                  required
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Nama Produk</label>
                <input
                  name="nama"
                  defaultValue={editing?.nama}
                  required
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Kode Barcode (satuan eceran)</label>
                <input
                  name="kode_barcode"
                  defaultValue={editing?.kode_barcode ?? ""}
                  placeholder="Scan atau ketik manual, boleh kosong"
                  className="border rounded-lg w-full px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Satuan Eceran</label>
                  <input
                    name="satuan"
                    defaultValue={editing?.satuan ?? "pcs"}
                    className="border rounded-lg w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Stok (eceran)</label>
                  <input
                    type="number"
                    name="stok"
                    defaultValue={editing?.stok ?? 0}
                    required
                    className="border rounded-lg w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Harga Modal</label>
                  <input
                    type="number"
                    name="harga_modal"
                    defaultValue={editing?.harga_modal ?? 0}
                    required
                    className="border rounded-lg w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Harga Jual</label>
                  <input
                    type="number"
                    name="harga_jual"
                    defaultValue={editing?.harga_jual ?? 0}
                    required
                    className="border rounded-lg w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Diskon (%)</label>
                <input
                  type="number"
                  name="diskon_persen"
                  min={0}
                  max={100}
                  defaultValue={editing?.diskon_persen ?? 0}
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Foto Produk</label>
                <input type="file" name="foto" accept="image/*" className="text-sm" />
                {editing?.foto_url && (
                  <p className="text-xs text-gray-400 mt-1">Sudah ada foto. Upload baru kalau mau ganti.</p>
                )}
              </div>

              {editing && (
                <label className="text-sm font-medium flex items-center gap-2">
                  <input type="checkbox" name="is_aktif" value="true" defaultChecked={editing.is_aktif} />
                  Tampilkan di katalog
                </label>
              )}

              {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}

              <button type="submit" className="bg-brand text-white rounded-lg py-2 text-sm w-full">
                {editing ? "Simpan Perubahan" : "Tambah Produk"}
              </button>
            </form>

            {/* Satuan besar. Sengaja di LUAR <form> di atas (bukan nested form),
                dikontrol lewat state + tombol biasa, disimpan terpisah dari
                form produk utama. */}
            {editing && (
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Satuan Besar (DOS/PAK, buat kulakan grosir)</p>
                  <button
                    type="button"
                    onClick={() => {
                      setUnitFormOpen((v) => !v);
                      resetUnitForm();
                    }}
                    className="text-brand text-xs"
                  >
                    {unitFormOpen ? "Tutup" : "+ Tambah"}
                  </button>
                </div>

                {loadingUnits ? (
                  <p className="text-xs text-gray-400">Memuat...</p>
                ) : units.length === 0 ? (
                  <p className="text-xs text-gray-400">Belum ada satuan besar.</p>
                ) : (
                  <table className="w-full text-xs mb-2">
                    <thead className="text-gray-500 text-left">
                      <tr>
                        <th className="pb-1">Satuan</th>
                        <th className="pb-1">Isi</th>
                        <th className="pb-1">Barcode</th>
                        <th className="pb-1">Beli</th>
                        <th className="pb-1">Jual</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((u) => (
                        <tr key={u.id} className="border-t">
                          <td className="py-1">{u.satuan}</td>
                          <td className="py-1">{u.konversi}x</td>
                          <td className="py-1 font-mono">{u.kode_barcode ?? "-"}</td>
                          <td className="py-1">Rp{u.harga_beli.toLocaleString("id-ID")}</td>
                          <td className="py-1">
                            {u.harga_jual ? `Rp${u.harga_jual.toLocaleString("id-ID")}` : "-"}
                          </td>
                          <td className="py-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteUnit(u.id)}
                              className="text-red-500"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {unitFormOpen && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={unitSatuan}
                        onChange={(e) => setUnitSatuan(e.target.value)}
                        placeholder="Nama satuan (DOS/PAK/RENCENG)"
                        className="border rounded-lg px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        value={unitKonversi}
                        onChange={(e) => setUnitKonversi(e.target.value)}
                        placeholder="Isi (contoh: 10)"
                        className="border rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                    <input
                      value={unitBarcode}
                      onChange={(e) => setUnitBarcode(e.target.value)}
                      placeholder="Barcode satuan ini (boleh kosong)"
                      className="border rounded-lg w-full px-2 py-1.5 text-xs font-mono"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={unitHargaBeli}
                        onChange={(e) => setUnitHargaBeli(e.target.value)}
                        placeholder="Harga beli"
                        className="border rounded-lg px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        value={unitHargaJual}
                        onChange={(e) => setUnitHargaJual(e.target.value)}
                        placeholder="Harga jual (opsional)"
                        className="border rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                    {unitErrorMsg && <p className="text-red-500 text-xs">{unitErrorMsg}</p>}
                    <button
                      type="button"
                      onClick={handleAddUnit}
                      disabled={unitSaving}
                      className="bg-brand text-white rounded-lg py-1.5 text-xs w-full disabled:opacity-50"
                    >
                      {unitSaving ? "Menyimpan..." : "Simpan Satuan"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}