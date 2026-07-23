"use client";

import { Printer } from "lucide-react";
import { downloadStruk } from "@/lib/strukGenerator";

export default function ReceiptModal({
  receipt,
  staffNama,
  onClose,
}: {
  receipt: any;
  staffNama: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
        <div className="text-brand text-4xl mb-2">✓</div>
        <div className="font-semibold text-lg mb-1">Transaksi Selesai</div>
        <div className="text-sm text-gray-500 mb-1 font-mono">{receipt.nomor_order}</div>
        <div className="text-2xl font-bold mb-1">Rp{receipt.total_jual.toLocaleString("id-ID")}</div>
        {receipt.kembalian !== null && receipt.kembalian > 0 && (
          <div className="text-sm text-brand mb-4">
            Kembalian: Rp{receipt.kembalian.toLocaleString("id-ID")}
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() =>
              downloadStruk({
                nomor_order: receipt.nomor_order,
                created_at: receipt.created_at,
                metode_bayar: receipt.metode_bayar,
                status_pesanan: "selesai",
                total_jual: receipt.total_jual,
                items: receipt.items,
                kasir_nama: staffNama,
                nama_pembeli: receipt.nama_pembeli,
                detail_bayar: receipt.detail_bayar,
                no_referensi: receipt.no_referensi,
                diskon_membership: receipt.diskon_membership,
                member_nama: receipt.member_nama,
                member_no_hp: receipt.member_no_hp,
              })
            }
            className="flex-1 border rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Printer size={15} />
            Cetak Struk
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-brand text-white rounded-xl py-2.5 text-sm font-medium"
          >
            Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}
