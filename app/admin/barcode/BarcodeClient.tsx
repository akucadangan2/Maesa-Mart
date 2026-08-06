"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Search, Printer, Trash2, X, Check, FileSpreadsheet } from "lucide-react";
import {
  searchBarcodeItems,
  generateBarcodeForProduct,
  type BarcodeSearchResult,
} from "./actions";

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

const STORAGE_KEY = "maesa_barcode_label_pref_v6";

type PrintMode = "single" | "grid";

interface SavedPref {
  mode: PrintMode;
  presetKey: string;
  customWidth: string;
  customHeight: string;
  gridTotalWidth: string;
  gridColumns: string;
  gridBoxWidth: string;
  gridBoxHeight: string;
  gridColGap: string;
  gridRowGap: string;
  gridOffsetX: string;
  gridBarcodeScale: string;
  gridColOffsets: string[];
}

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

function hitungBarcodeParams(widthMm: number, heightMm: number) {
  return {
    barcodeWidth: Math.max(1, Math.round((widthMm / 40) * 10) / 10),
    barcodeHeight: Math.max(14, Math.round(heightMm * 0.55)),
    fontSize: Math.max(6, Math.round(widthMm / 6)),
  };
}

function muatPreferensiTersimpan(): SavedPref | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedPref) : null;
  } catch {
    return null;
  }
}

function simpanPreferensi(pref: SavedPref) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
}

export default function BarcodeClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BarcodeSearchResult[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const svgRefs = useRef<Map<string, SVGSVGElement>>(new Map());
  const previewSvgRefs = useRef<Map<string, SVGSVGElement>>(new Map());
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  const [mode, setMode] = useState<PrintMode>("single");
  const [presetKey, setPresetKey] = useState<string>(PRESETS[0].key);
  const [customWidth, setCustomWidth] = useState("40");
  const [customHeight, setCustomHeight] = useState("30");

  const [gridTotalWidth, setGridTotalWidth] = useState("99");
  const [gridColumns, setGridColumns] = useState("3");
  const [gridBoxWidth, setGridBoxWidth] = useState("33");
  const [gridBoxHeight, setGridBoxHeight] = useState("15");
  const [gridColGap, setGridColGap] = useState("0");
  const [gridRowGap, setGridRowGap] = useState("3");
  const [gridOffsetX, setGridOffsetX] = useState("0");
  const [gridBarcodeScale, setGridBarcodeScale] = useState("100");
  const [gridColOffsets, setGridColOffsets] = useState<string[]>(["0", "0", "0"]);

  useEffect(() => {
    const saved = muatPreferensiTersimpan();
    if (saved) {
      setMode(saved.mode);
      setPresetKey(saved.presetKey);
      setCustomWidth(saved.customWidth);
      setCustomHeight(saved.customHeight);
      setGridTotalWidth(saved.gridTotalWidth);
      setGridColumns(saved.gridColumns);
      setGridBoxWidth(saved.gridBoxWidth ?? "33");
      setGridBoxHeight(saved.gridBoxHeight ?? "15");
      setGridColGap(saved.gridColGap ?? "0");
      setGridRowGap(saved.gridRowGap ?? "3");
      setGridOffsetX(saved.gridOffsetX ?? "0");
      setGridBarcodeScale(saved.gridBarcodeScale ?? "100");
      setGridColOffsets(saved.gridColOffsets ?? ["0", "0", "0"]);
    }
  }, []);

  function simpanSemua(patch: Partial<SavedPref>) {
    const pref: SavedPref = {
      mode,
      presetKey,
      customWidth,
      customHeight,
      gridTotalWidth,
      gridColumns,
      gridBoxWidth,
      gridBoxHeight,
      gridColGap,
      gridRowGap,
      gridOffsetX,
      gridBarcodeScale,
      gridColOffsets,
      ...patch,
    };
    simpanPreferensi(pref);
  }

  function ubahMode(m: PrintMode) {
    setMode(m);
    simpanSemua({ mode: m });
  }

  function pilihPreset(key: string) {
    setPresetKey(key);
    simpanSemua({ presetKey: key });
  }

  function ubahColOffset(index: number, value: string) {
    const next = [...gridColOffsets];
    while (next.length <= index) next.push("0");
    next[index] = value;
    setGridColOffsets(next);
    simpanSemua({ gridColOffsets: next });
  }

  const isCustom = presetKey === "custom";
  const preset = isCustom
    ? hitungPresetCustom(Number(customWidth) || 40, Number(customHeight) || 30)
    : PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];

  const pageWidthMm = mode === "grid" ? Number(gridTotalWidth) || 99 : preset.widthMm;

  const kolomCount = Math.max(1, Number(gridColumns) || 3);
  const totalWidthNum = Number(gridTotalWidth) || 99;
  const boxWidthNum = Number(gridBoxWidth) || 33;
  const boxHeightNum = Number(gridBoxHeight) || 15;
  const colGapNum = Number(gridColGap) || 0;
  const rowGapNum = Number(gridRowGap) || 0;
  const offsetXNum = Number(gridOffsetX) || 0;
  const barcodeScaleNum = (Number(gridBarcodeScale) || 100) / 100;

  const colWidthNum = boxWidthNum;
  const rowHeightNum = boxHeightNum;

  function colOffsetFor(index: number): number {
    return Number(gridColOffsets[index]) || 0;
  }

  const gridBarcodeParamsBase = hitungBarcodeParams(colWidthNum, rowHeightNum);
  const gridBarcodeParams = {
    barcodeWidth: gridBarcodeParamsBase.barcodeWidth * barcodeScaleNum,
    barcodeHeight: gridBarcodeParamsBase.barcodeHeight * barcodeScaleNum,
    fontSize: Math.max(6, Math.round(gridBarcodeParamsBase.fontSize * barcodeScaleNum)),
  };

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
    if (!item.kode_barcode) return;
    setQueue((prev) => {
      const existing = prev.find((q) => q.key === item.key);
      if (existing) {
        return prev.map((q) => (q.key === item.key ? { ...q, jumlah: q.jumlah + 1 } : q));
      }
      return [...prev, { ...item, jumlah: 1 }];
    });
    inputRef.current?.focus();
  }

  async function handleRowClick(item: BarcodeSearchResult) {
    if (item.kode_barcode) {
      tambahKeAntrian(item);
      return;
    }
    setGeneratingKey(item.key);
    try {
      const kode = await generateBarcodeForProduct(item.product_id);
      const updatedItem: BarcodeSearchResult = { ...item, kode_barcode: kode };
      setResults((prev) => prev.map((r) => (r.key === item.key ? updatedItem : r)));
      tambahKeAntrian(updatedItem);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal bikin barcode");
    } finally {
      setGeneratingKey(null);
    }
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

  function escapeCsvField(value: string | number) {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function handleExportCsv() {
    if (queue.length === 0) return;

    const header = ["Barcode", "Nama Produk", "Harga", "Satuan", "Jumlah Label"];
    const rows = queue.map((q) => [
      q.kode_barcode ?? "",
      q.nama_produk,
      q.harga,
      q.satuan,
      q.jumlah,
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCsvField).join(","))
      .join("\r\n");

    // Tambah BOM biar Excel baca karakter non-ASCII (misal nama produk
    // dengan simbol) dengan benar, bukan cuma software CSV biasa.
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barcode-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const printItems = queue.flatMap((item, itemIndex) =>
    Array.from({ length: item.jumlah }, (_, copyIndex) => ({
      ...item,
      printKey: `${item.key}-${itemIndex}-${copyIndex}`,
    }))
  );

  const printRows: (typeof printItems)[] =
    mode === "grid"
      ? Array.from({ length: Math.ceil(printItems.length / kolomCount) }, (_, i) =>
          printItems.slice(i * kolomCount, i * kolomCount + kolomCount)
        )
      : [];

  const previewSampleItem = {
    nama_produk: "CONTOH PRODUK",
    kode_barcode: "8991234567890",
    harga: 5000,
  };
  const previewRowSource =
    printItems.length > 0
      ? printItems.slice(0, kolomCount)
      : Array.from({ length: kolomCount }, (_, i) => ({
          ...previewSampleItem,
          printKey: `preview-${i}`,
        }));

  useEffect(() => {
    printItems.forEach((item) => {
      const el = svgRefs.current.get(item.printKey);
      if (el && item.kode_barcode) {
        const params = mode === "grid" ? gridBarcodeParams : preset;
        try {
          JsBarcode(el, item.kode_barcode, {
            format: "CODE128",
            width: params.barcodeWidth,
            height: params.barcodeHeight,
            displayValue: false,
            margin: 1,
          });
        } catch {
          // Barcode gagal di-render (kode gak valid), biarin kosong
        }
      }
    });
  }, [printItems.length, queue, preset, mode, gridBarcodeParams]);

  useEffect(() => {
    if (mode !== "grid") return;
    previewRowSource.forEach((item) => {
      const el = previewSvgRefs.current.get(item.printKey);
      if (el && item.kode_barcode) {
        try {
          JsBarcode(el, item.kode_barcode, {
            format: "CODE128",
            width: gridBarcodeParams.barcodeWidth,
            height: gridBarcodeParams.barcodeHeight,
            displayValue: false,
            margin: 1,
          });
        } catch {
          // Barcode contoh gagal render, biarin kosong
        }
      }
    });
  }, [mode, gridBarcodeParams, printItems.length, queue]);

  return (
    <div>
      <div className="no-print">
        <h1 className="text-xl font-bold mb-4">Cetak Barcode</h1>

        <div className="mb-4">
          <label className="text-sm font-medium block mb-1.5">Mode Cetak</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => ubahMode("single")}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                mode === "single" ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600 bg-white"
              }`}
            >
              1 Label per Baris
            </button>
            <button
              onClick={() => ubahMode("grid")}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                mode === "grid" ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600 bg-white"
              }`}
            >
              Grid Beberapa Kolom
            </button>
          </div>

          {mode === "single" ? (
            <>
              <label className="text-xs text-gray-500 block mb-1.5">Ukuran Label</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => pilihPreset(p.key)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                      presetKey === p.key
                        ? "bg-brand text-white border-brand"
                        : "border-gray-200 text-gray-600 bg-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => pilihPreset("custom")}
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
                      onChange={(e) => {
                        setCustomWidth(e.target.value);
                        simpanSemua({ customWidth: e.target.value });
                      }}
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
                      onChange={(e) => {
                        setCustomHeight(e.target.value);
                        simpanSemua({ customHeight: e.target.value });
                      }}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-50 border rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">
                Diisi berdasarkan hasil ukur manual roll fisik pakai penggaris.
              </p>
              <div className="grid grid-cols-3 gap-2 max-w-md mb-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Lebar Total Roll (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gridTotalWidth}
                    onChange={(e) => {
                      setGridTotalWidth(e.target.value);
                      simpanSemua({ gridTotalWidth: e.target.value });
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Jumlah Kolom</label>
                  <input
                    type="number"
                    min={1}
                    value={gridColumns}
                    onChange={(e) => {
                      setGridColumns(e.target.value);
                      simpanSemua({ gridColumns: e.target.value });
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div />
              </div>
              <div className="grid grid-cols-4 gap-2 max-w-lg mb-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Lebar 1 Kotak (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gridBoxWidth}
                    onChange={(e) => {
                      setGridBoxWidth(e.target.value);
                      simpanSemua({ gridBoxWidth: e.target.value });
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tinggi 1 Kotak (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gridBoxHeight}
                    onChange={(e) => {
                      setGridBoxHeight(e.target.value);
                      simpanSemua({ gridBoxHeight: e.target.value });
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Celah Kolom (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gridColGap}
                    onChange={(e) => {
                      setGridColGap(e.target.value);
                      simpanSemua({ gridColGap: e.target.value });
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Celah Baris (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gridRowGap}
                    onChange={(e) => {
                      setGridRowGap(e.target.value);
                      simpanSemua({ gridRowGap: e.target.value });
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-w-xs mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Geser Semua Kolom (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gridOffsetX}
                    onChange={(e) => {
                      setGridOffsetX(e.target.value);
                      simpanSemua({ gridOffsetX: e.target.value });
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Perbesar Barcode (%)</label>
                  <input
                    type="number"
                    step="5"
                    min={50}
                    max={200}
                    value={gridBarcodeScale}
                    onChange={(e) => {
                      setGridBarcodeScale(e.target.value);
                      simpanSemua({ gridBarcodeScale: e.target.value });
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">
                  Geser per kolom (mm) — buat pas satu kolom aja meleset (misal kolom paling kanan),
                  kolom lain gak ikut kegeser. Boleh negatif (geser kiri).
                </p>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: kolomCount }, (_, i) => (
                    <div key={i}>
                      <label className="text-xs text-gray-500 block mb-1">Kolom {i + 1} (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={gridColOffsets[i] ?? "0"}
                        onChange={(e) => ubahColOffset(i, e.target.value)}
                        className="w-24 border rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                1 kotak real: {boxWidthNum}mm x {boxHeightNum}mm · celah kolom {colGapNum}mm · celah baris {rowGapNum}mm · barcode {gridBarcodeScale}%
              </p>

              <div className="mt-4 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-2">
                  Preview skala nyata di layar (garis putus-putus = perkiraan garis potong roll fisik).
                  Bandingkan lebar & jaraknya langsung ke roll asli sebelum cetak sungguhan.
                </p>
                <div className="overflow-x-auto bg-gray-200 rounded-lg p-4">
                  <div
                    style={{
                      width: `${totalWidthNum}mm`,
                      paddingLeft: `${offsetXNum}mm`,
                      boxSizing: "border-box",
                    }}
                  >
                    {[0, 1].map((rowIdx) => (
                      <div
                        key={rowIdx}
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          marginBottom: rowIdx === 0 ? `${rowGapNum}mm` : 0,
                        }}
                      >
                        {previewRowSource.map((item, colIdx) => (
                          <div
                            key={`${rowIdx}-${item.printKey}`}
                            style={{
                              width: `${colWidthNum}mm`,
                              height: `${rowHeightNum}mm`,
                              marginRight: colIdx < previewRowSource.length - 1 ? `${colGapNum}mm` : 0,
                              transform: `translateX(${colOffsetFor(colIdx)}mm)`,
                              border: "1px dashed #9ca3af",
                              background: "white",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              padding: "0.5mm",
                            }}
                          >
                            <div
                              style={{
                                fontSize: `${gridBarcodeParams.fontSize + 1}px`,
                                fontWeight: 700,
                                textAlign: "center",
                                textTransform: "uppercase",
                                lineHeight: 1.1,
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.nama_produk}
                            </div>
                            {rowIdx === 0 ? (
                              <svg
                                ref={(el) => {
                                  if (el) previewSvgRefs.current.set(item.printKey, el);
                                }}
                              />
                            ) : (
                              <div style={{ fontSize: "6px", color: "#9ca3af" }}>(barcode)</div>
                            )}
                            <div
                              style={{
                                fontSize: `${gridBarcodeParams.fontSize}px`,
                                fontWeight: 600,
                                textAlign: "center",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.kode_barcode} Rp.{item.harga.toLocaleString("id-ID")}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {printItems.length === 0
                    ? "Belum ada produk di antrian, preview ini pakai data contoh."
                    : `Preview pakai ${Math.min(kolomCount, printItems.length)} produk pertama di antrian kamu.`}
                </p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1.5">Pengaturan ini otomatis keinget di komputer ini.</p>
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
            placeholder="Cari nama produk (yang belum ada barcode juga muncul)..."
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
                Klik buat nambah. Produk yang belum ada barcode bisa langsung dibikinin di sini.
              </div>
              {results.map((r) => {
                const belumAdaBarcode = !r.kode_barcode;
                const sudahAda = jumlahDiAntrian(r.key);
                const sedangGenerate = generatingKey === r.key;

                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => handleRowClick(r)}
                    disabled={sedangGenerate}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 border-b last:border-0 disabled:opacity-60"
                  >
                    <div>
                      <div className="font-medium">{r.nama_produk}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {r.kode_barcode ?? "Belum ada kode"} · {r.satuan}
                      </div>
                    </div>
                    {belumAdaBarcode ? (
                      <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-1 shrink-0 ml-2">
                        {sedangGenerate ? "Membuat..." : "Belum ada barcode, klik buat"}
                      </span>
                    ) : sudahAda > 0 ? (
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
            onClick={handleExportCsv}
            disabled={queue.length === 0}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            <FileSpreadsheet size={15} />
            Export ke Excel
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
          {mode === "grid"
            ? `Dicetak ${kolomCount} label sejajar per baris, lanjut baris berikutnya di bawahnya.`
            : "Label dicetak menyambung ke bawah 1 per baris."}
        </p>
      </div>

      <div className="print-area">
        {mode === "single"
          ? printItems.map((item) => (
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
            ))
          : printRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="label-row"
                style={{
                  width: `${totalWidthNum}mm`,
                  boxSizing: "border-box",
                  paddingLeft: `${offsetXNum}mm`,
                  marginBottom: `${rowGapNum}mm`,
                  display: "flex",
                  flexDirection: "row",
                }}
              >
                {Array.from({ length: kolomCount }, (_, colIndex) => {
                  const item = row[colIndex];
                  return (
                    <div
                      key={item ? item.printKey : `empty-${rowIndex}-${colIndex}`}
                      style={{
                        width: `${colWidthNum}mm`,
                        height: `${rowHeightNum}mm`,
                        marginRight: colIndex < kolomCount - 1 ? `${colGapNum}mm` : 0,
                        transform: `translateX(${colOffsetFor(colIndex)}mm)`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        padding: "0.5mm",
                        visibility: item ? "visible" : "hidden",
                      }}
                    >
                      {item && (
                        <>
                          <div
                            style={{
                              fontSize: `${gridBarcodeParams.fontSize + 1}px`,
                              fontWeight: 700,
                              textAlign: "center",
                              textTransform: "uppercase",
                              lineHeight: 1.1,
                              maxWidth: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
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
                              fontSize: `${gridBarcodeParams.fontSize}px`,
                              fontWeight: 600,
                              textAlign: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.kode_barcode} Rp.{item.harga.toLocaleString("id-ID")}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
      </div>

      <style jsx global>{`
        .print-area {
          display: none;
        }
        @media print {
          @page {
            size: ${pageWidthMm}mm auto;
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