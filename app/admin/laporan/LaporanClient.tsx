"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { LaporanKeuntunganHarian } from "@/lib/types";

type Mode = "harian" | "bulanan";

export default function LaporanClient({ data }: { data: LaporanKeuntunganHarian[] }) {
  const [mode, setMode] = useState<Mode>("harian");

  // Supabase kadang balikin kolom numeric sebagai string, jadi di-Number()-kan dulu
  const normalized = useMemo(
    () =>
      data.map((d) => ({
        tanggal: d.tanggal,
        total_omzet: Number(d.total_omzet),
        total_modal: Number(d.total_modal),
        total_laba: Number(d.total_laba),
      })),
    [data]
  );

  const chartData = useMemo(() => {
    if (mode === "harian") {
      return normalized
        .slice()
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
        .slice(-30)
        .map((d) => ({
          label: new Date(d.tanggal).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          }),
          omzet: d.total_omzet,
          modal: d.total_modal,
          laba: d.total_laba,
        }));
    }

    const grouped: Record<string, { omzet: number; modal: number; laba: number }> = {};
    for (const d of normalized) {
      const bulan = d.tanggal.slice(0, 7);
      if (!grouped[bulan]) grouped[bulan] = { omzet: 0, modal: 0, laba: 0 };
      grouped[bulan].omzet += d.total_omzet;
      grouped[bulan].modal += d.total_modal;
      grouped[bulan].laba += d.total_laba;
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bulan, v]) => ({
        label: new Date(bulan + "-01").toLocaleDateString("id-ID", {
          month: "short",
          year: "numeric",
        }),
        omzet: v.omzet,
        modal: v.modal,
        laba: v.laba,
      }));
  }, [normalized, mode]);

  const totalOmzet = normalized.reduce((sum, d) => sum + d.total_omzet, 0);
  const totalModal = normalized.reduce((sum, d) => sum + d.total_modal, 0);
  const totalLaba = normalized.reduce((sum, d) => sum + d.total_laba, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Laporan Keuntungan</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("harian")}
            className={`text-sm px-3 py-1.5 rounded-lg ${
              mode === "harian" ? "bg-brand text-white" : "bg-white border"
            }`}
          >
            Harian
          </button>
          <button
            onClick={() => setMode("bulanan")}
            className={`text-sm px-3 py-1.5 rounded-lg ${
              mode === "bulanan" ? "bg-brand text-white" : "bg-white border"
            }`}
          >
            Bulanan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Total Omzet (semua waktu)</div>
          <div className="text-lg font-bold">Rp{totalOmzet.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Total Modal (semua waktu)</div>
          <div className="text-lg font-bold">Rp{totalModal.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Total Laba (semua waktu)</div>
          <div className="text-lg font-bold text-brand">Rp{totalLaba.toLocaleString("id-ID")}</div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada data transaksi.</p>
      ) : (
        <div className="bg-white rounded-lg border p-4" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(v) => `${Math.round(v / 1000).toLocaleString("id-ID")}rb`}
              />
              <Tooltip formatter={(value: number) => `Rp${value.toLocaleString("id-ID")}`} />
              <Legend />
              <Line type="monotone" dataKey="omzet" stroke="#94a3b8" name="Omzet" />
              <Line type="monotone" dataKey="modal" stroke="#f97316" name="Modal" />
              <Line
                type="monotone"
                dataKey="laba"
                stroke="#16a34a"
                name="Laba"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}