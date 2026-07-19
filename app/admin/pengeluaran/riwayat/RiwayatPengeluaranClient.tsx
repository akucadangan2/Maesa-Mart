"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getExpenseDetail } from "./actions";

interface ExpenseListRow {
  id: string;
  created_at: string;
  total_pengeluaran: number;
  expense_items: { id: string }[];
}

interface ExpenseDetail extends ExpenseListRow {
  expense_items: {
    id: string;
    nama: string;
    satuan: string | null;
    harga: number;
    jumlah: number;
    total: number;
    foto_nota_url: string | null;
  }[];
}

export default function RiwayatPengeluaranClient({ expenses }: { expenses: ExpenseListRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, ExpenseDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      setLoadingId(id);
      try {
        const detail = (await getExpenseDetail(id)) as ExpenseDetail;
        setDetailCache((prev) => ({ ...prev, [id]: detail }));
      } finally {
        setLoadingId(null);
      }
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Data Pengeluaran</h1>

      {expenses.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">Belum ada pengeluaran.</p>
      )}

      <div className="space-y-2">
        {expenses.map((exp) => {
          const isExpanded = expandedId === exp.id;
          const detail = detailCache[exp.id];
          const isLoading = loadingId === exp.id;

          return (
            <div key={exp.id} className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleExpand(exp.id)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium">
                    {new Date(exp.created_at).toLocaleDateString("id-ID")}
                  </div>
                  <div className="text-xs text-gray-500">{exp.expense_items.length} item</div>
                </div>
                <span className="font-semibold text-sm">
                  Rp{exp.total_pengeluaran.toLocaleString("id-ID")}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t p-4 overflow-x-auto">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <Loader2 size={15} className="animate-spin" />
                      Memuat detail...
                    </div>
                  )}
                  {detail && (
                    <table className="w-full text-sm min-w-[500px]">
                      <thead className="text-left text-gray-500">
                        <tr>
                          <th className="pb-2">Nota</th>
                          <th className="pb-2">Nama</th>
                          <th className="pb-2">Harga</th>
                          <th className="pb-2">Jumlah</th>
                          <th className="pb-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.expense_items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="py-1.5">
                              {item.foto_nota_url ? (
                                <a href={item.foto_nota_url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={item.foto_nota_url}
                                    className="w-10 h-10 object-cover rounded"
                                    alt="nota"
                                  />
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="py-1.5">{item.nama}</td>
                            <td className="py-1.5">Rp{item.harga.toLocaleString("id-ID")}</td>
                            <td className="py-1.5">{item.jumlah}</td>
                            <td className="py-1.5">Rp{item.total.toLocaleString("id-ID")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}