"use client";

import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import type { Supplier } from "@/lib/types";
import { searchProdukPembelian, createPurchase, type PembelianSearchResult } from "./actions";

interface CartItem extends PembelianSearchResult {
  harga_beli: number;
  jumlah: number;
  tgl_kadaluarsa: string;
}

export default function PembelianClient({ suppliers }: { suppliers: Supplier[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PembelianSearchResult[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [noFaktur, setNoFaktur] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim()) {
        setResults(await searchProdukPembelian(query));
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function tambahKeCart(item: PembelianSearchResult) {
    setCart((prev) => [
      ...prev,
      { ...item, harga_beli: item.harga_beli_default, jumlah: 1, tgl_kadaluarsa: "" },
    ]);
    setQuery("");
    setResults([]);
  }

  function updateCartItem(index: number, patch: Partial<CartItem>) {
    setCart((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function hapusDariCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  const totalHarga = cart.reduce((sum, it) => sum + it.harga_beli * it.jumlah, 0);

  async function handleSubmit() {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (cart.length === 0) {
      setErrorMsg("Belum ada item, cari produk dulu di atas.");
      return;
    }
    if (!supplierId) {
      setErrorMsg("Pilih supplier dulu.");
      return;
    }

    setSubmitting(true);
    try {
      await createPurchase({
        supplier_id: supplierId,
        no_faktur: noFaktur || null,
        items: cart.map((it) => ({
          product_id: it.product_id,
          product_unit_id: it.product_unit_id,
          nama_produk_snapshot: it.nama_produk,
          satuan: it.satuan,
          konversi: it.konversi,
          harga_beli: it.harga_beli,
          jumlah: it.jumlah,
          tgl_kadaluarsa: it.tgl_kadaluarsa || null,
        })),
      });

      setSuccessMsg("Transaksi pembelian tersimpan, stok sudah diperbarui.");
      setCart([]);
      setSupplierId("");
      setNoFaktur("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Transaksi Pembelian</h1>

      <div className="relative mb-4">
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
                onClick={() => tambahKeCart(r)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 border-b last:border-0"
              >
                <div>
                  <div className="font-medium">{r.nama_produk}</div>
                  <div className="text-xs text-gray-500">
                    {r.satuan}
                    {r.konversi > 1 && ` (isi ${r.konversi})`} · modal terakhir Rp
                    {r.harga_beli_default.toLocaleString("id-ID")}
                  </div>
                </div>
                <span className="text-xs text-brand">+ Tambah</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden mb-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">No</th>
              <th className="p-3">Nama Produk</th>
              <th className="p-3">Satuan</th>
              <th className="p-3">Harga Beli</th>
              <th className="p-3">Jumlah</th>
              <th className="p-3">Kadaluarsa</th>
              <th className="p-3">Total</th>
              <th className="p-3">Hapus</th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-400 italic">
                  Belum ada item produk.
                </td>
              </tr>
            ) : (
              cart.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{it.nama_produk}</td>
                  <td className="p-3">
                    {it.satuan}
                    {it.konversi > 1 && <span className="text-gray-400"> (isi {it.konversi})</span>}
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={it.harga_beli}
                      onChange={(e) => updateCartItem(i, { harga_beli: Number(e.target.value) })}
                      className="w-24 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={1}
                      value={it.jumlah}
                      onChange={(e) =>
                        updateCartItem(i, { jumlah: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-16 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      value={it.tgl_kadaluarsa}
                      onChange={(e) => updateCartItem(i, { tgl_kadaluarsa: e.target.value })}
                      className="border rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="p-3 font-medium">
                    Rp{(it.harga_beli * it.jumlah).toLocaleString("id-ID")}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-sm font-medium block mb-1">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="border rounded-lg w-full px-3 py-2 text-sm bg-white"
          >
            <option value="">Pilih supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">No Faktur (opsional)</label>
          <input
            value={noFaktur}
            onChange={(e) => setNoFaktur(e.target.value)}
            className="border rounded-lg w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Total Harga</label>
          <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 font-semibold">
            Rp{totalHarga.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      {errorMsg && <p className="text-red-500 text-sm mb-3">{errorMsg}</p>}
      {successMsg && <p className="text-brand text-sm mb-3">{successMsg}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-brand text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Menyimpan..." : "Simpan Transaksi"}
      </button>
    </div>
  );
}