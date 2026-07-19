import { createServiceRoleClient } from "@/lib/supabase/server";
import LaporanKasirClient from "./LaporanKasirClient";

interface RekapEntry {
  kasir_id: string;
  nama: string;
  jumlah_transaksi: number;
  total_omzet: number;
}

function formatTanggal(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function LaporanKasirPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string; kasir?: string }>;
}) {
  const params = await searchParams;
  const today = formatTanggal(new Date());
  const dari = params.dari ?? today;
  const sampai = params.sampai ?? today;
  const kasirId = params.kasir ?? "semua";

  const supabase = createServiceRoleClient();

  const { data: staffList } = await supabase.from("staff").select("id, nama, is_aktif").order("nama");

  const startIso = new Date(`${dari}T00:00:00`).toISOString();
  const endIso = new Date(`${sampai}T23:59:59`).toISOString();

  let query = supabase
    .from("orders")
    .select("id, total_jual, metode_bayar, kasir_id, created_at")
    .eq("channel", "pos")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (kasirId !== "semua") {
    query = query.eq("kasir_id", kasirId);
  }

  const { data: orders } = await query;
  const rows = orders ?? [];

  const namaByKasirId: Record<string, string> = {};
  for (const s of staffList ?? []) {
    namaByKasirId[s.id] = s.nama;
  }

  const totalTransaksi = rows.length;
  const totalOmzet = rows.reduce((sum, o) => sum + o.total_jual, 0);
  const totalTunai = rows
    .filter((o) => o.metode_bayar === "tunai")
    .reduce((s, o) => s + o.total_jual, 0);
  const totalTransfer = rows
    .filter((o) => o.metode_bayar === "transfer")
    .reduce((s, o) => s + o.total_jual, 0);
  const totalKartu = rows
    .filter((o) => o.metode_bayar === "kartu")
    .reduce((s, o) => s + o.total_jual, 0);

  const rekapObj: Record<string, RekapEntry> = {};

  for (const o of rows) {
    const id = o.kasir_id ?? "tidak_diketahui";
    const nama = o.kasir_id ? namaByKasirId[o.kasir_id] ?? "Kasir terhapus" : "Tidak diketahui";

    if (rekapObj[id]) {
      rekapObj[id].jumlah_transaksi += 1;
      rekapObj[id].total_omzet += o.total_jual;
    } else {
      rekapObj[id] = { kasir_id: id, nama, jumlah_transaksi: 1, total_omzet: o.total_jual };
    }
  }

  const rekapPerKasir = Object.values(rekapObj).sort((a, b) => b.total_omzet - a.total_omzet);

  return (
    <LaporanKasirClient
      staffList={(staffList ?? []).filter((s) => s.is_aktif)}
      dari={dari}
      sampai={sampai}
      kasirId={kasirId}
      summary={{ totalTransaksi, totalOmzet, totalTunai, totalTransfer, totalKartu }}
      rekapPerKasir={rekapPerKasir}
    />
  );
}