"use client";

import { useState } from "react";
import { Search, Download, Bot, User, Loader2, X, Maximize2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  cekStokProduk,
  daftarStokMenipisHabis,
  daftarStokMinus,
  produkPalingLaku,
  produkPalingJarang,
  type StokRow,
} from "./actions";

interface Kategori {
  id: string;
  nama: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  rows?: StokRow[];
  showTerjual?: boolean;
}

const TANGGAL_HARI_INI = new Date().toLocaleDateString("id-ID", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const PREVIEW_LIMIT = 10;

function formatRp(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

function exportExcel(rows: StokRow[], namaFile: string) {
  const wb = XLSX.utils.book_new();
  const data = rows.map((r, i) => ({
    No: i + 1,
    "Nama Produk": r.nama,
    Kategori: r.kategori,
    Satuan: r.satuan,
    "Stok Sekarang": r.stok,
    "Stok Minimum": r.stok_minimum,
    "Qty Perlu Dibeli": r.qty_perlu_dibeli,
    "Harga Modal (Satuan)": r.harga_modal,
    "Harga Jual (Satuan)": r.harga_jual,
    "Total Harga Modal": r.total_harga_modal,
    "Satuan Besar Tersedia": r.satuan_besar_info,
    ...(r.total_terjual != null ? { "Total Terjual": r.total_terjual } : {}),
  }));
  const sheet = XLSX.utils.json_to_sheet([{ No: `Tanggal: ${TANGGAL_HARI_INI}` } as any, {}, ...data] as any);
  XLSX.utils.book_append_sheet(wb, sheet, "Daftar Belanjaan");
  XLSX.writeFile(wb, `${namaFile}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function TabelStok({ rows, showTerjual }: { rows: StokRow[]; showTerjual?: boolean }) {
  return (
    <table className="w-full text-xs min-w-[600px]">
      <thead className="bg-gray-50 text-gray-600 sticky top-0">
        <tr>
          <th className="p-2 text-left">Produk</th>
          <th className="p-2 text-left">Kategori</th>
          <th className="p-2 text-right">Stok</th>
          <th className="p-2 text-right">Qty Beli</th>
          <th className="p-2 text-right">Harga Modal</th>
          <th className="p-2 text-right">Total</th>
          {showTerjual && <th className="p-2 text-right">Terjual</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t">
            <td className="p-2 text-gray-800">{r.nama}</td>
            <td className="p-2 text-gray-500">{r.kategori}</td>
            <td className="p-2 text-right">
              {r.stok} {r.satuan}
            </td>
            <td className="p-2 text-right font-medium text-brand">{r.qty_perlu_dibeli}</td>
            <td className="p-2 text-right">{formatRp(r.harga_modal)}</td>
            <td className="p-2 text-right font-medium">{formatRp(r.total_harga_modal)}</td>
            {showTerjual && <td className="p-2 text-right">{r.total_terjual ?? 0}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AsistenStokClient({ kategoriList }: { kategoriList: Kategori[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: `Halo! Saya Asisten Stok Maesa Mart. Hari ini ${TANGGAL_HARI_INI}. Pilih salah satu tombol di bawah, atau cari nama produk langsung.`,
    },
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [kategoriPickerOpen, setKategoriPickerOpen] = useState(false);
  const [periodePickerOpen, setPeriodePickerOpen] = useState(false);
  const [modalData, setModalData] = useState<{ rows: StokRow[]; showTerjual?: boolean } | null>(null);

  function tambahPesan(msg: ChatMessage) {
    setMessages((prev) => [...prev, msg]);
  }

  async function jalankanAksi(
    labelUser: string,
    fn: () => Promise<StokRow[]>,
    showTerjual = false
  ) {
    tambahPesan({ id: crypto.randomUUID(), role: "user", text: labelUser });
    setLoading(true);
    try {
      const rows = await fn();
      tambahPesan({
        id: crypto.randomUUID(),
        role: "bot",
        text:
          rows.length === 0
            ? "Gak ada data yang cocok."
            : `Ketemu ${rows.length} produk. Data per ${TANGGAL_HARI_INI}.`,
        rows,
        showTerjual,
      });
    } catch (err) {
      tambahPesan({
        id: crypto.randomUUID(),
        role: "bot",
        text: err instanceof Error ? `Gagal: ${err.message}` : "Terjadi kesalahan.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCariProduk() {
    if (!query.trim()) return;
    const q = query.trim();
    setQuery("");
    await jalankanAksi(`Cek stok: "${q}"`, () => cekStokProduk(q));
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col">
      <h1 className="text-xl font-bold mb-3 flex items-center gap-2">
        <Bot size={22} className="text-brand" />
        Asisten Stok
      </h1>

      {/* ===== Shortcut ===== */}
      <div className="flex flex-wrap gap-2 mb-3 shrink-0">
        <button
          onClick={() =>
            jalankanAksi("Daftar belanjaan: stok menipis & habis, urut A-Z", () =>
              daftarStokMenipisHabis(true)
            )
          }
          className="text-xs border rounded-full px-3 py-1.5 bg-white hover:bg-gray-50"
        >
          📋 Belanjaan stok menipis/habis (A-Z)
        </button>
        <button
          onClick={() =>
            jalankanAksi(
              "Daftar belanjaan: produk paling laku (30 hari)",
              () => produkPalingLaku("bulanan"),
              true
            )
          }
          className="text-xs border rounded-full px-3 py-1.5 bg-white hover:bg-gray-50"
        >
          🔥 Belanjaan produk paling laku
        </button>
        <button
          onClick={() => setKategoriPickerOpen(true)}
          className="text-xs border rounded-full px-3 py-1.5 bg-white hover:bg-gray-50"
        >
          🗂️ Belanjaan per kategori (menipis/habis)
        </button>
        <button
          onClick={() => jalankanAksi("List stok yang minus", () => daftarStokMinus())}
          className="text-xs border rounded-full px-3 py-1.5 bg-white hover:bg-gray-50"
        >
          ⚠️ Stok minus
        </button>
        <button
          onClick={() => setPeriodePickerOpen(true)}
          className="text-xs border rounded-full px-3 py-1.5 bg-white hover:bg-gray-50"
        >
          🐢 Produk paling jarang dibeli
        </button>
      </div>

      {/* ===== Chat area (tinggi tetap, scroll di dalam) ===== */}
      <div className="h-[420px] overflow-y-auto bg-white border rounded-xl p-4 space-y-4 mb-3">
        {messages.map((m) => {
          const totalRows = m.rows?.length ?? 0;
          const previewRows = m.rows?.slice(0, PREVIEW_LIMIT) ?? [];
          const adaLebihBanyak = totalRows > PREVIEW_LIMIT;

          return (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  m.role === "user" ? "bg-brand text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs mb-1 opacity-70">
                  {m.role === "bot" ? <Bot size={12} /> : <User size={12} />}
                  {m.role === "bot" ? "Asisten Stok" : "Kamu"}
                </div>
                <div className="text-sm">{m.text}</div>

                {totalRows > 0 && (
                  <div className="mt-3 bg-white rounded-lg overflow-x-auto border">
                    <TabelStok rows={previewRows} showTerjual={m.showTerjual} />

                    {adaLebihBanyak && (
                      <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
                        Menampilkan {PREVIEW_LIMIT} dari {totalRows} produk.
                      </div>
                    )}

                    <div className="flex border-t">
                      {adaLebihBanyak && (
                        <button
                          onClick={() => setModalData({ rows: m.rows!, showTerjual: m.showTerjual })}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-brand py-2 hover:bg-gray-50 border-r"
                        >
                          <Maximize2 size={13} />
                          Lihat Semua ({totalRows})
                        </button>
                      )}
                      <button
                        onClick={() => exportExcel(m.rows!, "daftar-belanjaan")}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-brand py-2 hover:bg-gray-50"
                      >
                        <Download size={13} />
                        Export ke Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 size={13} className="animate-spin" />
            Memproses...
          </div>
        )}
      </div>

      {/* ===== Input pencarian produk ===== */}
      <div className="relative shrink-0">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCariProduk()}
          placeholder='Cek stok produk tertentu, misal "Indomie"...'
          className="w-full pl-9 pr-20 py-3 rounded-xl border text-sm"
        />
        <button
          onClick={handleCariProduk}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand text-white text-xs px-3 py-1.5 rounded-lg"
        >
          Kirim
        </button>
      </div>

      {/* ===== Modal Lihat Semua ===== */}
      {modalData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h2 className="font-semibold">Daftar Lengkap ({modalData.rows.length} produk)</h2>
              <button onClick={() => setModalData(null)} className="text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <TabelStok rows={modalData.rows} showTerjual={modalData.showTerjual} />
            </div>
            <div className="p-3 border-t shrink-0">
              <button
                onClick={() => exportExcel(modalData.rows, "daftar-belanjaan")}
                className="w-full flex items-center justify-center gap-1.5 bg-brand text-white text-sm py-2.5 rounded-lg"
              >
                <Download size={14} />
                Export ke Excel ({modalData.rows.length} produk)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal pilih kategori ===== */}
      {kategoriPickerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h2 className="font-semibold mb-3">Pilih Kategori</h2>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {kategoriList.map((k) => (
                <button
                  key={k.id}
                  onClick={async () => {
                    setKategoriPickerOpen(false);
                    await jalankanAksi(
                      `Daftar belanjaan kategori "${k.nama}" (menipis/habis)`,
                      () => daftarStokMenipisHabis(true, k.id)
                    );
                  }}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 border"
                >
                  {k.nama}
                </button>
              ))}
            </div>
            <button
              onClick={() => setKategoriPickerOpen(false)}
              className="w-full mt-3 border rounded-lg py-2 text-sm text-gray-500"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ===== Modal pilih periode ===== */}
      {periodePickerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h2 className="font-semibold mb-3">Pilih Periode</h2>
            <div className="space-y-1.5">
              {(["harian", "mingguan", "bulanan", "tahunan"] as const).map((p) => (
                <button
                  key={p}
                  onClick={async () => {
                    setPeriodePickerOpen(false);
                    await jalankanAksi(
                      `Produk paling jarang dibeli (${p})`,
                      () => produkPalingJarang(p),
                      true
                    );
                  }}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 border capitalize"
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPeriodePickerOpen(false)}
              className="w-full mt-3 border rounded-lg py-2 text-sm text-gray-500"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}