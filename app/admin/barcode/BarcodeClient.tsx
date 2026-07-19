"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Search, Printer, Trash2 } from "lucide-react";
import { searchBarcodeItems, type BarcodeSearchResult } from "./actions";

interface QueueItem extends BarcodeSearchResult {
  jumlah: number;
}

export default function BarcodeClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BarcodeSearchResult[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const svgRefs = useRef<Map<string, SVGSVGElement>>(new Map());

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim()) {
        setResults(await searchBarcodeItems(query));
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function tambahKeAntrian(item: BarcodeSearchResult) {
    setQueue((prev) => {
      const existing = prev.find((q) => q.key === item.key);
      if (existing) {
        return prev.map((q) => (q.key === item.key ? { ...q, jumlah: q.jumlah + 1 } : q));
      }
      return [...prev, { ...item, jumlah: 1 }];
    });
    setQuery("");
    setResults([]);
  }

  function ubahJumlah(key: string, jumlah: number) {
    setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, jumlah: Math.max(1, jumlah) } : q)));
  }

  function hapusDariAntrian(key: string) {
    setQueue((prev) => prev.filter((q) => q.key !== key));
  }

  const printItems = queue.flatMap((item, itemIndex) =>
    Array.from({ length: item.jumlah }, (_, copyIndex) => ({
      ...item,
      printKey: `${item.key}-${itemIndex}-${copyIndex}`,
    }))
  );

  useEffect(() => {
    printItems.forEach((item) => {
      const el = svgRefs.current.get(item.printKey);
      if (el) {
        try {
          JsBarcode(el, item.kode_barcode, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            fontSize: 12,
            margin: 4,
          });
        } catch {
          // Barcode gagal di-render (kode gak valid), biarin kosong
        }
      }
    });
  }, [printItems.length, queue]);

  return (
    <div>
      <div className="no-print">
        <h1 className="text-xl font-bold mb-4">Cetak Barcode</h1>

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
                  onClick={() => tambahKeAntrian(r)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">{r.nama_produk}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {r.kode_barcode} · {r.satuan}
                    </div>
                  </div>
                  <span className="text-xs text-brand">+ Tambah</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Kode Barcode</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3">Satuan</th>
                <th className="p-3">Jumlah</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400 italic">
                    Belum ada item, cari produk di atas buat ditambahkan.
                  </td>
                </tr>
              ) : (
                queue.map((q, i) => (
                  <tr key={q.key} className="border-t">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 font-mono text-xs">{q.kode_barcode}</td>
                    <td className="p-3">{q.nama_produk}</td>
                    <td className="p-3">{q.satuan}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        value={q.jumlah}
                        onChange={(e) => ubahJumlah(q.key, Number(e.target.value))}
                        className="w-16 border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <button onClick={() => hapusDariAntrian(q.key)} className="text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setQueue([])}
            className="border border-red-300 text-red-600 rounded-lg px-4 py-2 text-sm"
          >
            Kosongkan Daftar
          </button>
          <button
            onClick={() => window.print()}
            disabled={printItems.length === 0}
            className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            <Printer size={15} />
            Cetak Barcode ({printItems.length} label)
          </button>
        </div>
      </div>

      <div className="print-area">
        <div className="grid grid-cols-3 gap-2">
          {printItems.map((item) => (
            <div key={item.printKey} className="border border-dashed border-gray-400 p-2 text-center">
              <svg
                ref={(el) => {
                  if (el) svgRefs.current.set(item.printKey, el);
                }}
              />
              <div className="text-[10px] truncate">{item.nama_produk}</div>
              <div className="text-[10px] font-semibold">Rp{item.harga.toLocaleString("id-ID")}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .print-area {
          display: none;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .print-area {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}