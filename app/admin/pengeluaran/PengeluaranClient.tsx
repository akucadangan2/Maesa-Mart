"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { searchProdukPengeluaran, createExpense, type PengeluaranSearchResult } from "./actions";

interface CartItem {
  product_id: string | null;
  nama: string;
  satuan: string | null;
  harga: number;
  jumlah: number;
  foto: File | null;
  fotoPreview: string | null;
}

export default function PengeluaranClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PengeluaranSearchResult[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [namaUmum, setNamaUmum] = useState("");
  const [nominalUmum, setNominalUmum] = useState("");
  const fotoUmumRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim()) {
        setResults(await searchProdukPengeluaran(query));
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function tambahProdukKeCart(item: PengeluaranSearchResult) {
    setCart((prev) => [
      ...prev,
      {
        product_id: item.product_id,
        nama: item.nama_produk,
        satuan: item.satuan,
        harga: item.harga_modal_terakhir,
        jumlah: 1,
        foto: null,
        fotoPreview: null,
      },
    ]);
    setQuery("");
    setResults([]);
  }

  function tambahUmumKeCart() {
    if (!namaUmum.trim() || !nominalUmum) {
      setErrorMsg("Isi nama pengeluaran dan nominal dulu.");
      return;
    }
    const foto = fotoUmumRef.current?.files?.[0] ?? null;
    setCart((prev) => [
      ...prev,
      {
        product_id: null,
        nama: namaUmum,
        satuan: null,
        harga: Number(nominalUmum),
        jumlah: 1,
        foto,
        fotoPreview: foto ? URL.createObjectURL(foto) : null,
      },
    ]);
    setNamaUmum("");
    setNominalUmum("");
    if (fotoUmumRef.current) fotoUmumRef.current.value = "";
    setErrorMsg(null);
  }

  function updateCartItem(index: number, patch: Partial<CartItem>) {
    setCart((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function hapusDariCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  const totalPengeluaran = cart.reduce((sum, it) => sum + it.harga * it.jumlah, 0);

  async function handleSubmit() {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (cart.length === 0) {
      setErrorMsg("Belum ada item.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("count", String(cart.length));
      cart.forEach((it, i) => {
        formData.set(`items[${i}][product_id]`, it.product_id ?? "");
        formData.set(`items[${i}][nama]`, it.nama);
        formData.set(`items[${i}][satuan]`, it.satuan ?? "");
        formData.set(`items[${i}][harga]`, String(it.harga));
        formData.set(`items[${i}][jumlah]`, String(it.jumlah));
        if (it.foto) formData.set(`items[${i}][foto]`, it.foto);
      });

      await createExpense(formData);
      setSuccessMsg("Pengeluaran tersimpan.");
      setCart([]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Pengeluaran Baru</h1>

      <div className="bg-white rounded-lg border p-4 mb-4">
        <p className="text-sm font-medium mb-2">Barang (nambah stok, tanpa lewat supplier resmi)</p>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama produk atau scan/ketik barcode..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.key}
                  onClick={() => tambahProdukKeCart(r)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">{r.nama_produk}</div>
                    <div className="text-xs text-gray-500">
                      {r.satuan} · modal terakhir Rp{r.harga_modal_terakhir.toLocaleString("id-ID")}
                    </div>
                  </div>
                  <span className="text-xs text-brand">+ Tambah</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm font-medium mb-2">Pengeluaran umum (gak nambah stok, misal: plastik, ongkos)</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <input
            value={namaUmum}
            onChange={(e) => setNamaUmum(e.target.value)}
            placeholder="Nama pengeluaran"
            className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="number"
            value={nominalUmum}
            onChange={(e) => setNominalUmum(e.target.value)}
            placeholder="Nominal"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input ref={fotoUmumRef} type="file" accept="image/*" className="text-xs" />
        </div>
        <button
          onClick={tambahUmumKeCart}
          className="mt-2 border border-brand text-brand rounded-lg px-3 py-1.5 text-xs"
        >
          + Tambah ke Daftar
        </button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden mb-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[650px]">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">No</th>
              <th className="p-3">Nota</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Satuan</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Jumlah</th>
              <th className="p-3">Total</th>
              <th className="p-3">Hapus</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-400 italic">
                  Belum ada item.
                </td>
              </tr>
            ) : (
              cart.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">
                    {it.fotoPreview ? (
                      <img src={it.fotoPreview} className="w-10 h-10 object-cover rounded" alt="nota" />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3">{it.nama}</td>
                  <td className="p-3">{it.satuan ?? "-"}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={it.harga}
                      onChange={(e) => updateCartItem(i, { harga: Number(e.target.value) })}
                      className="w-24 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={1}
                      value={it.jumlah}
                      disabled={!it.product_id}
                      onChange={(e) =>
                        updateCartItem(i, { jumlah: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-16 border rounded px-2 py-1 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="p-3 font-medium">
                    Rp{(it.harga * it.jumlah).toLocaleString("id-ID")}
                  </td>
                  <td className="p-3">
                    <button onClick={() => hapusDariCart(i)} className="text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">Total Pengeluaran</span>
        <span className="font-bold text-lg">Rp{totalPengeluaran.toLocaleString("id-ID")}</span>
      </div>

      {errorMsg && <p className="text-red-500 text-sm mb-3">{errorMsg}</p>}
      {successMsg && <p className="text-brand text-sm mb-3">{successMsg}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-brand text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
      </button>
    </div>
  );
}