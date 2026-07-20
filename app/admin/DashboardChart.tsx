"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardChart({ data }: { data: { label: string; laba: number }[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-gray-400 italic py-8 text-center">Belum ada data.</p>;
  }

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="label" fontSize={12} />
          <YAxis
            fontSize={12}
            tickFormatter={(v) => `${Math.round(v / 1000).toLocaleString("id-ID")}rb`}
          />
          <Tooltip formatter={(value: number) => `Rp${value.toLocaleString("id-ID")}`} />
          <Area type="monotone" dataKey="laba" stroke="#1E56A0" fill="#1E56A033" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}