"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Category, Product, ProductUnit } from "@/lib/types";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  getProductUnits,
  createProductUnit,
  deleteProductUnit,
} from "./actions";

const PRESET_SATUAN = ["DOS", "PAK", "BOX", "RENCENG", "IKAT", "KARUNG", "KRAT", "ZAK", "LUSIN", "GTG"];

const STATUS_TABS = [
  { key: "aktif", label: "Aktif" },
  { key: "arsip", label: "Arsip" },
  { key: "semua", label: "Semua" },
];

function hargaEfektif(p: Product) {
  return p.diskon_persen > 0
    ? Math.round(p.harga_jual * (1 - p.diskon_persen / 100))
    : p.harga_jual;
}

function formatRibuan(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function parseRibuan(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

export default function ProdukClient({
  initialProducts,
  categories,
  totalCount,
  pageSize,
  currentPage,
  currentQuery,
  currentStatus,
  statusCounts,
}: {
  initialProducts: Product[];
  categories: Category[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  currentQuery: string;
  currentStatus: string;
  statusCounts: { aktif: number; arsip: number; semua: number };
}) {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState(currentQuery);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [hargaModal, setHargaModal] = useState("");
  const [hargaJual, setHargaJual] = useState("");

  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [unitErrorMsg, setUnitErrorMsg] = useState<string | null>(null);
  const [unitSaving, setUnitSaving] = useState(false);

  const [unitSatuanPreset, setUnitSatuanPreset] = useState(PRESET_SATUAN[0]);
  const [unitSatuanCustom, setUnitSatuanCustom] = useState("");
  const [unitKonversi, setUnitKonversi] = useState("");
  const [unitBarcode, setUnitBarcode] = useState("");
  const [unitHargaBeli, setUnitHargaBeli] = useState("");
  const [unitHargaJual, setUnitHargaJual] = useState("");

  const isCustomSatuan = unitSatuanPreset === "lainnya";
  const finalSatuanValue = isCustomSatuan ? unitSatuanCustom : unitSatuanPreset;

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== currentQuery) {
        navigate({ page: 1, q: searchInput, status: currentStatus });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function navigate(opts: { page: number; q: string; size?: number; status?: string }) {
    const sp = new URLSearchParams();
    sp.set("page", String(opts.page));
    sp.set("size", String(opts.size ?? pageSize));
    sp.set("status", opts.status ?? currentStatus);
    if (opts.q) sp.set("q", opts.q);
    router.push(`/admin/produk?${sp.toString()}`);
  }

  function resetUnitForm() {
    setUnitSatuanPreset(PRESET_SATUAN[0]);
    setUnitSatuanCustom("");
    setUnitKonversi("");
    setUnitBarcode("");
    setUnitHargaBeli("");
    setUnitHargaJual("");
    setUnitErrorMsg(null);
  }

  function openTambah() {
    setEditing(null);
    setErrorMsg(null);
    setHargaModal("");
    setHargaJual("");
    setUnits([]);
    setUnitFormOpen(false);
    resetUnitForm();
    setFormOpen(true);
  }

  async function openEdit(product: Product) {
    setEditing(product);
    setErrorMsg(null);
    setHargaModal(formatRibuan(String(product.harga_modal)));
    setHargaJual(formatRibuan(String(product.harga_jual)));
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
    formData.set("harga_modal", String(parseRibuan(hargaModal)));
    formData.set("harga_jual", String(parseRibuan(hargaJual)));
    try {
      if (editing) {
        await updateProduct(editing.id, formData);
      } else {
        await createProduct(formData);
      }
      setFormOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }

  function handleDelete(product: Product) {
    if (!confirm(`Hapus produk "${product.nama}"?`)) return;
    setIsPending(true);
    deleteProduct(product.id)
      .then((result) => {
        router.refresh();
        if (result.archived) {
          alert(
            `"${product.nama}" udah pernah dipakai di transaksi, jadi otomatis diarsipkan (bisa dilihat di tab Arsip) daripada dihapus permanen. Riwayat transaksi lama tetap aman.`
          );
        }
      })
      .catch((err) => {
        alert(err instanceof Error ? err.message : "Gagal menghapus produk.");
      })
      .finally(() => setIsPending(false));
  }

  function handleToggleActive(product: Product) {
    setIsPending(true);
    toggleProductActive(product.id, !product.is_aktif)
      .then(() => router.refresh())
      .catch((err) => alert(err instanceof Error ? err.message : "Gagal mengubah status."))
      .finally(() => setIsPending(false));
  }

  async function handleAddUnit() {
    if (!editing) return;
    setUnitErrorMsg(null);

    if (!finalSatuanValue.trim() || !unitKonversi || !unitHargaBeli) {
      setUnitErrorMsg("Satuan, Isi, dan Harga Beli wajib diisi.");
      return;
    }

    setUnitSaving(true);
    try {
      const formData = new FormData();
      formData.set("satuan", finalSatuanValue.trim());
      formData.set("konversi", unitKonversi);
      formData.set("kode_barcode", unitBarcode.trim());
      formData.set("harga_beli", String(parseRibuan(unitHargaBeli)));
      formData.set("harga_jual", String(parseRibuan(unitHargaJual)));

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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Produk</h1>
        <button onClick={openTambah} className="bg-brand text-white rounded-lg px-4 py-2 text-sm">
          + Tambah Produk
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate({ page: 1, q: currentQuery, status: t.key })}
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

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama produk / kode barcode..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          />
        </div>
        <select
          value={pageSize}
          onChange={(e) => navigate({ page: 1, q: currentQuery, size: Number(e.target.value) })}
          className="border border-gray-200 rounded-lg px-2 text-sm bg-white"
        >
          <option value={10}>10 / halaman</option>
          <option value={20}>20 / halaman</option>
          <option value={50}>50 / halaman</option>
        </select>
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
          {initialProducts.length === 0 ? (
            <tr>
              <td colSpan={10} className="p-4 text-center text-gray-400 italic">
                {currentQuery
                  ? `Gak ada produk yang cocok dengan "${currentQuery}".`
                  : currentStatus === "arsip"
                  ? "Belum ada produk yang diarsipkan."
                  : "Belum ada produk."}
              </td>
            </tr>
          ) : (
            initialProducts.map((p) => (
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
                    {p.is_aktif ? "Aktif" : "Arsip"}
                  </span>
                </td>
                  <td className="p-3 space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(p)} className="text-brand text-xs">
                    Edit
                  </button>
                  {p.is_aktif ? (
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={isPending}
                      className="text-red-500 text-xs"
                    >
                      Hapus
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleActive(p)}
                        disabled={isPending}
                        className="text-brand text-xs"
                      >
                        Aktifkan Kembali
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={isPending}
                        className="text-red-500 text-xs"
                      >
                        Hapus Permanen
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={currentPage <= 1}
            onClick={() => navigate({ page: currentPage - 1, q: currentQuery })}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Sebelumnya
          </button>
          <span className="text-sm text-gray-500">
            Halaman {currentPage} dari {totalPages} ({totalCount} produk)
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => navigate({ page: currentPage + 1, q: currentQuery })}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            Berikutnya <ChevronRight size={14} />
          </button>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{editing ? "Edit Produk" : "Tambah Produk"}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* KIRI: form produk utama */}
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
                      type="text"
                      inputMode="numeric"
                      value={hargaModal}
                      onChange={(e) => setHargaModal(formatRibuan(e.target.value))}
                      placeholder="0"
                      required
                      className="border rounded-lg w-full px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Harga Jual</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={hargaJual}
                      onChange={(e) => setHargaJual(formatRibuan(e.target.value))}
                      placeholder="0"
                      required
                      className="border rounded-lg w-full px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                    <input type="file" name="foto" accept="image/*" className="text-xs w-full" />
                  </div>
                </div>
                {editing?.foto_url && (
                  <p className="text-xs text-gray-400 -mt-2">Sudah ada foto. Upload baru kalau mau ganti.</p>
                )}

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

              {/* KANAN: satuan besar */}
              <div className="border-l md:pl-6">
                <p className="text-sm font-medium mb-1">Satuan Besar</p>
                <p className="text-xs text-gray-400 mb-3">
                  Buat kulakan/jual grosir (DOS, PAK, RENCENG, dll), harga & barcode beda dari eceran.
                </p>

                {!editing ? (
                  <p className="text-xs text-gray-400 italic bg-gray-50 rounded-lg p-3">
                    Simpan produk ini dulu, satuan besar bisa ditambahkan setelah dibuka lagi lewat Edit.
                  </p>
                ) : (
                  <>
                    {loadingUnits ? (
                      <p className="text-xs text-gray-400">Memuat...</p>
                    ) : units.length === 0 ? (
                      <p className="text-xs text-gray-400 mb-3">Belum ada satuan besar.</p>
                    ) : (
                      <table className="w-full text-xs mb-3">
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

                    {!unitFormOpen ? (
                      <button
                        type="button"
                        onClick={() => setUnitFormOpen(true)}
                        className="text-brand text-xs border border-brand rounded-lg px-3 py-1.5 w-full"
                      >
                        + Tambah Satuan Besar
                      </button>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={unitSatuanPreset}
                            onChange={(e) => setUnitSatuanPreset(e.target.value)}
                            className="border rounded-lg px-2 py-1.5 text-xs bg-white"
                          >
                            {PRESET_SATUAN.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                            <option value="lainnya">Lainnya...</option>
                          </select>
                          <input
                            type="number"
                            value={unitKonversi}
                            onChange={(e) => setUnitKonversi(e.target.value)}
                            placeholder="Isi (contoh: 10)"
                            className="border rounded-lg px-2 py-1.5 text-xs"
                          />
                        </div>

                        {isCustomSatuan && (
                          <input
                            value={unitSatuanCustom}
                            onChange={(e) => setUnitSatuanCustom(e.target.value)}
                            placeholder="Nama satuan custom"
                            className="border rounded-lg w-full px-2 py-1.5 text-xs"
                          />
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={unitHargaBeli}
                            onChange={(e) => setUnitHargaBeli(formatRibuan(e.target.value))}
                            placeholder="Harga beli"
                            className="border rounded-lg px-2 py-1.5 text-xs font-mono"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={unitHargaJual}
                            onChange={(e) => setUnitHargaJual(formatRibuan(e.target.value))}
                            placeholder="Harga jual (opsional)"
                            className="border rounded-lg px-2 py-1.5 text-xs font-mono"
                          />
                        </div>

                        <input
                          value={unitBarcode}
                          onChange={(e) => setUnitBarcode(e.target.value)}
                          placeholder="Barcode satuan ini (boleh kosong)"
                          className="border rounded-lg w-full px-2 py-1.5 text-xs font-mono"
                        />

                        {unitErrorMsg && <p className="text-red-500 text-xs">{unitErrorMsg}</p>}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUnitFormOpen(false);
                              resetUnitForm();
                            }}
                            className="border rounded-lg py-1.5 text-xs"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleAddUnit}
                            disabled={unitSaving}
                            className="bg-brand text-white rounded-lg py-1.5 text-xs disabled:opacity-50"
                          >
                            {unitSaving ? "Menyimpan..." : "Simpan"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}