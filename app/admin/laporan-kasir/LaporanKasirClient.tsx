"use client";

import { useRouter } from "next/navigation";
import { Printer, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface StaffOption {
  id: string;
  nama: string;
}

interface RekapKasir {
  kasir_id: string;
  nama: string;
  jumlah_transaksi: number;
  total_omzet: number;
}

export default function LaporanKasirClient({
  staffList,
  dari,
  sampai,
  kasirId,
  summary,
  rekapPerKasir,
}: {
  staffList: StaffOption[];
  dari: string;
  sampai: string;
  kasirId: string;
  summary: {
    totalTransaksi: number;
    totalOmzet: number;
    totalTunai: number;
    totalTransfer: number;
    totalKartu: number;
  };
  rekapPerKasir: RekapKasir[];
}) {
  const router = useRouter();

  function navigate(opts: { dari: string; sampai: string; kasir: string }) {
    const sp = new URLSearchParams();
    sp.set("dari", opts.dari);
    sp.set("sampai", opts.sampai);
    sp.set("kasir", opts.kasir);
    router.push(`/admin/laporan-kasir?${sp.toString()}`);
  }

  const namaKasirTerpilih =
    kasirId === "semua" ? "Semua Kasir" : staffList.find((s) => s.id === kasirId)?.nama ?? "-";

  function handleExportExcel() {
    const wb = XLSX.utils.book_new();

    const ringkasanSheet = XLSX.utils.aoa_to_sheet([
      ["Laporan Penjualan Kasir"],
      [`Periode: ${dari} s/d ${sampai}`],
      [`Kasir: ${namaKasirTerpilih}`],
      [],
      ["Jumlah Transaksi", summary.totalTransaksi],
      ["Total Omzet", summary.totalOmzet],
      ["Tunai", summary.totalTunai],
      ["Transfer", summary.totalTransfer],
      ["Kartu", summary.totalKartu],
    ]);
    XLSX.utils.book_append_sheet(wb, ringkasanSheet, "Ringkasan");

    if (kasirId === "semua" && rekapPerKasir.length > 0) {
      const rekapSheet = XLSX.utils.json_to_sheet(
        rekapPerKasir.map((r) => ({
          Kasir: r.nama,
          "Jumlah Transaksi": r.jumlah_transaksi,
          "Total Omzet": r.total_omzet,
        }))
      );
      XLSX.utils.book_append_sheet(wb, rekapSheet, "Rekap per Kasir");
    }

    XLSX.writeFile(wb, `laporan-kasir-${dari}_${sampai}.xlsx`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Laporan Penjualan Kasir</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 border border-brand text-brand rounded-lg px-4 py-2 text-sm"
          >
            <Download size={15} />
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm"
          >
            <Printer size={15} />
            Cetak
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 bg-white border rounded-lg p-4">
        <div>
          <label className="text-sm font-medium block mb-1">Tanggal Awal</label>
          <input
            type="date"
            value={dari}
            onChange={(e) => navigate({ dari: e.target.value, sampai, kasir: kasirId })}
            className="border rounded-lg w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Tanggal Akhir</label>
          <input
            type="date"
            value={sampai}
            onChange={(e) => navigate({ dari, sampai: e.target.value, kasir: kasirId })}
            className="border rounded-lg w-full px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium block mb-1">Kasir</label>
          <select
            value={kasirId}
            onChange={(e) => navigate({ dari, sampai, kasir: e.target.value })}
            className="border rounded-lg w-full px-3 py-2 text-sm bg-white"
          >
            <option value="semua">Semua Kasir</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Jml Transaksi</div>
          <div className="text-lg font-bold">{summary.totalTransaksi}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Omzet</div>
          <div className="text-lg font-bold">Rp{summary.totalOmzet.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Tunai</div>
          <div className="text-lg font-bold">Rp{summary.totalTunai.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Transfer</div>
          <div className="text-lg font-bold">Rp{summary.totalTransfer.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Kartu</div>
          <div className="text-lg font-bold">Rp{summary.totalKartu.toLocaleString("id-ID")}</div>
        </div>
      </div>

      {kasirId === "semua" ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Kasir</th>
                <th className="p-3">Jml Transaksi</th>
                <th className="p-3">Total Omzet</th>
              </tr>
            </thead>
            <tbody>
              {rekapPerKasir.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400 italic">
                    Belum ada transaksi kasir di rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                rekapPerKasir.map((r) => (
                  <tr key={r.kasir_id} className="border-t">
                    <td className="p-3">{r.nama}</td>
                    <td className="p-3">{r.jumlah_transaksi}</td>
                    <td className="p-3 font-medium">Rp{r.total_omzet.toLocaleString("id-ID")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Menampilkan rekap untuk <span className="font-medium">{namaKasirTerpilih}</span> pada rentang
          tanggal terpilih (lihat angka ringkasan di atas).
        </p>
      )}
    </div>
  );
}