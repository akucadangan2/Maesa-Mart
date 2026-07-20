"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Image as ImageIcon, ScanBarcode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UnitRow {
  id: string;
  satuan: string;
  konversi: number;
  harga_jual: number | null;
  kode_barcode: string | null;
}

interface ProdukResult {
  id: string;
  nama: string;
  satuan: string;
  harga_jual: number;
  diskon_persen: number;
  foto_url: string | null;
  kode_barcode: string | null;
  product_units: UnitRow[];
}

const PRODUCT_SELECT =
  "id, nama, satuan, harga_jual, diskon_persen, foto_url, kode_barcode, is_aktif, product_units(id, satuan, konversi, harga_jual, kode_barcode)";

function hargaEfektif(p: ProdukResult) {
  return p.diskon_persen > 0
    ? Math.round(p.harga_jual * (1 - p.diskon_persen / 100))
    : p.harga_jual;
}

export default function CekHargaPage() {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProdukResult[]>([]);
  const [selected, setSelected] = useState<ProdukResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const seq = ++searchSeq.current;
    const q = query.trim();

    if (!q) {
      setResults([]);
      setNotFound(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const t = setTimeout(async () => {
      const [{ data: byProduct }, { data: unitMatches }] = await Promise.all([
        supabase
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("is_aktif", true)
          .or(`nama.ilike.%${q}%,kode_barcode.ilike.%${q}%`)
          .limit(10),
        supabase
          .from("product_units")
          .select("id, product_id, kode_barcode")
          .not("harga_jual", "is", null)
          .ilike("kode_barcode", `%${q}%`)
          .limit(10),
      ]);

      if (seq !== searchSeq.current) return;

      const resultsMap = new Map<string, ProdukResult>();
      for (const p of (byProduct ?? []) as ProdukResult[]) {
        resultsMap.set(p.id, p);
      }

      const missingIds = (unitMatches ?? [])
        .map((u) => u.product_id)
        .filter((id) => !resultsMap.has(id));

      if (missingIds.length > 0) {
        const { data: extra } = await supabase
          .from("products")
          .select(PRODUCT_SELECT)
          .in("id", missingIds)
          .eq("is_aktif", true);
        for (const p of (extra ?? []) as ProdukResult[]) {
          resultsMap.set(p.id, p);
        }
      }

      const data = Array.from(resultsMap.values());
      setLoading(false);

      if (data.length === 0) {
        setNotFound(true);
        setResults([]);
      } else if (data.length === 1) {
        setNotFound(false);
        setResults([]);
        setSelected(data[0]);
        setQuery("");
        inputRef.current?.focus();
      } else {
        setNotFound(false);
        setSelected(null);
        setResults(data);
      }
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function pilihDariList(p: ProdukResult) {
    setSelected(p);
    setResults([]);
    setQuery("");
    inputRef.current?.focus();
  }

  function tutupDetail() {
    setSelected(null);
    setQuery("");
    inputRef.current?.focus();
  }

  const unitJual = (selected?.product_units ?? []).filter((u) => u.harga_jual != null);

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-8">
      <div className="max-w-lg w-full">
        <div className="flex flex-col items-center mb-6">
          <img src="/866x288.png" alt="Maesa Mart" className="h-12 w-auto mb-2" />
          <h1 className="text-lg font-semibold text-gray-700">Cek Harga</h1>
        </div>

        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan barcode atau ketik nama produk..."
            className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200 text-lg bg-white shadow-sm focus:outline-none focus:border-brand"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              aria-label="Hapus"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {loading && <p className="text-center text-gray-400 text-sm py-6">Mencari...</p>}

        {notFound && !loading && (
          <div className="text-center py-10">
            <p className="text-gray-500">Produk gak ditemukan.</p>
            <p className="text-xs text-gray-400 mt-1">Coba cari pakai nama lain atau scan ulang.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => pilihDariList(p)}
                className="w-full flex items-center justify-between bg-white border rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.nama}</div>
                  <div className="text-xs text-gray-400 font-mono">{p.kode_barcode ?? "-"}</div>
                </div>
                <span className="text-brand text-sm shrink-0 ml-2">Lihat harga →</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4 mb-5">
              {selected.foto_url ? (
                <img
                  src={selected.foto_url}
                  alt={selected.nama}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <ImageIcon size={24} className="text-gray-300" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xl font-bold leading-snug">{selected.nama}</div>
                {selected.kode_barcode && (
                  <div className="text-xs text-gray-400 font-mono">{selected.kode_barcode}</div>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <span className="text-base font-medium text-gray-700">{selected.satuan}</span>
                <div className="text-right">
                  {selected.diskon_persen > 0 && (
                    <div className="text-xs text-gray-400 line-through font-mono">
                      Rp{selected.harga_jual.toLocaleString("id-ID")}
                    </div>
                  )}
                  <span className="text-3xl font-bold font-mono text-brand">
                    Rp{hargaEfektif(selected).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {unitJual.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-4"
                >
                  <span className="text-base font-medium text-gray-700">{u.satuan}</span>
                  <span className="text-3xl font-bold font-mono text-brand">
                    Rp{(u.harga_jual as number).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={tutupDetail}
              className="w-full border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium"
            >
              Cek Produk Lain
            </button>
          </div>
        )}

        {!query && !selected && results.length === 0 && !notFound && (
          <div className="text-center py-16 text-gray-300">
            <ScanBarcode size={56} className="mx-auto mb-3" />
            <p className="text-sm text-gray-400">Scan barcode atau ketik nama produk untuk cek harga</p>
          </div>
        )}
      </div>
    </main>
  );
}