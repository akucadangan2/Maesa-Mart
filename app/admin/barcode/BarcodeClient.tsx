"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Search, Printer, Trash2, X, Check } from "lucide-react";
import { searchBarcodeItems, type BarcodeSearchResult } from "./actions";

interface QueueItem extends BarcodeSearchResult {
  jumlah: number;
}

interface LabelPreset {
  key: string;
  label: string;
  widthMm: number;
  heightMm: number;
  barcodeWidth: number;
  barcodeHeight: number;
  fontSize: number;
}

const PRESETS: LabelPreset[] = [
  { key: "40x30", label: "40 x 30 mm", widthMm: 40, heightMm: 30, barcodeWidth: 1, barcodeHeight: 24, fontSize: 8 },
  { key: "50x30", label: "50 x 30 mm", widthMm: 50, heightMm: 30, barcodeWidth: 1.2, barcodeHeight: 26, fontSize: 9 },
  { key: "58x40", label: "58 x 40 mm", widthMm: 58, heightMm: 40, barcodeWidth: 1.4, barcodeHeight: 32, fontSize: 10 },
  { key: "102x152", label: "4 x 6 inch (102 x 152 mm)", widthMm: 102, heightMm: 152, barcodeWidth: 2.5, barcodeHeight: 60, fontSize: 16 },
];

function hitungPresetCustom(widthMm: number, heightMm: number): LabelPreset {
  return {
    key: "custom",
    label: "Custom",
    widthMm,
    heightMm,
    barcodeWidth: Math.max(1, Math.round((widthMm / 40) * 10) / 10),
    barcodeHeight: Math.max(20, Math.round(heightMm * 0.6)),
    fontSize: Math.max(7, Math.round(widthMm / 5)),
  };
}

export default function BarcodeClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BarcodeSearchResult[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [presetKey, setPresetKey] = useState<string>(PRESETS[0].key);
  const [customWidth, setCustomWidth] = useState("40");
  const [customHeight, setCustomHeight] = useState("30");
  const svgRefs = useRef<Map<string, SVGSVGElement>>(new Map());
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  const isCustom = presetKey === "custom";
  const preset = isCustom
    ? hitungPresetCustom(Number(customWidth) || 40, Number(customHeight) || 30)
    : PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];

  // Cari produk, tahan hasil telat biar gak nimpa hasil yang lebih baru
  useEffect(() => {
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const data = await searchBarcodeItems(query);
      if (seq === searchSeq.current) {
        setResults(data);
        setDropdownOpen(true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Dropdown cuma nutup kalau klik di luar area search, BUKAN otomatis
  // setelah pilih 1 item, biar bisa lanjut pilih item lain dari hasil yang sama.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function tambahKeAntrian(item: BarcodeSearchResult) {
    setQueue((prev) => {
      const existing = prev.find((q) => q.key === item.key);
      if (existing) {
        return prev.map((q) => (q.key === item.key ? { ...q, jumlah: q.jumlah + 1 } : q));
      }
      return [...prev, { ...item, jumlah: 1 }];
    });
    // Sengaja TIDAK di-reset query/results, biar dropdown tetap kebuka
    // dan bisa langsung klik produk lain dari hasil pencarian yang sama.
    inputRef.current?.focus();
  }

  function bersihkanPencarian() {
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
    inputRef.current?.focus();
  }

  function jumlahDiAntrian(key: string) {
    return queue.find((q) => q.key === key)?.jumlah ?? 0;
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
            width: preset.barcodeWidth,
            height: preset.barcodeHeight,
            displayValue: false,
            margin: 2,
          });
        } catch {
          // Barcode gagal di-render (kode gak valid), biarin kosong
        }
      }
    });
  }, [printItems.length, queue, preset]);

  return (
    <div>
      <div className="no-print">
        <h1 className="text-xl font-bold mb-4">Cetak Barcode</h1>

        <div className="mb-4">
          <label className="text-sm font-medium block mb-1.5">Ukuran Label (sesuaikan sama roll di printer)</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPresetKey(p.key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                  presetKey === p.key ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600 bg-white"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPresetKey("custom")}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                isCustom ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600 bg-white"
              }`}
            >
              Custom...
            </button>
          </div>

          {isCustom && (
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg p-3 max-w-xs">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Lebar (mm)</label>
                <input
                  type="number"
                  min={10}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <span className="text-gray-400 mt-5">x</span>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tinggi (mm)</label>
                <input
                  type="number"
                  min={10}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div ref={searchBoxRef} className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              if (results.length > 0) setDropdownOpen(true);
            }}
            placeholder="Cari nama produk atau scan/ketik barcode..."
            className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-200 text-sm bg-white"
          />
          {query && (
            <button
              onClick={bersihkanPencarian}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-label="Hapus pencarian"
              type="button"
            >
              <X size={15} />
            </button>
          )}

          {dropdownOpen && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] text-gray-400 border-b bg-gray-50">
                Klik produk buat nambah, dropdown tetap kebuka biar bisa nambah beberapa sekaligus
              </div>
              {results.map((r) => {
                const sudahAda = jumlahDiAntrian(r.key);
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => tambahKeAntrian(r)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 border-b last:border-0"
                  >
                    <div>
                      <div className="font-medium">{r.nama_produk}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {r.kode_barcode} · {r.satuan}
                      </div>
                    </div>
                    {sudahAda > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-brand font-medium shrink-0 ml-2">
                        <Check size={13} />
                        {sudahAda}x, tambah lagi?
                      </span>
                    ) : (
                      <span className="text-xs text-brand shrink-0 ml-2">+ Tambah</span>
                    )}
                  </button>
                );
              })}
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
                <th className="p-3">Jumlah Label</th>
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
        <p className="text-xs text-gray-400 mt-2">
          Label dicetak menyambung ke bawah sesuai lebar roll yang dipilih (kayak printer struk),
          jumlahnya ngikutin kolom "Jumlah Label" di tabel atas.
        </p>
      </div>

      <div className="print-area">
        {printItems.map((item) => (
          <div
            key={item.printKey}
            className="label-page"
            style={{
              width: `${preset.widthMm}mm`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2mm",
            }}
          >
            <div
              style={{
                fontSize: `${preset.fontSize + 1}px`,
                fontWeight: 700,
                textAlign: "center",
                textTransform: "uppercase",
                lineHeight: 1.2,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginBottom: "1mm",
              }}
            >
              {item.nama_produk}
            </div>
            <svg
              ref={(el) => {
                if (el) svgRefs.current.set(item.printKey, el);
              }}
            />
            <div
              style={{
                fontSize: `${preset.fontSize}px`,
                fontWeight: 600,
                textAlign: "center",
                marginTop: "1mm",
                whiteSpace: "nowrap",
              }}
            >
              {item.kode_barcode} Rp.{item.harga.toLocaleString("id-ID")}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .print-area {
          display: none;
        }
        @media print {
          @page {
            size: ${preset.widthMm}mm auto;
            margin: 0;
          }
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