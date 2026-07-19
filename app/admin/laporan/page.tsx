import { createServiceRoleClient } from "@/lib/supabase/server";
import LaporanClient from "./LaporanClient";
import type { LaporanKeuntunganHarian } from "@/lib/types";

export default async function AdminLaporanPage() {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("v_laporan_keuntungan_harian")
    .select("*")
    .order("tanggal", { ascending: true });

  return <LaporanClient data={(data ?? []) as LaporanKeuntunganHarian[]} />;
}