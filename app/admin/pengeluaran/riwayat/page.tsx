import { createServiceRoleClient } from "@/lib/supabase/server";
import RiwayatPengeluaranClient from "./RiwayatPengeluaranClient";

export default async function DataPengeluaranPage() {
  const supabase = createServiceRoleClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, expense_items(id), suppliers(nama)")
    .order("created_at", { ascending: false })
    .limit(100);

  return <RiwayatPengeluaranClient expenses={expenses ?? []} />;
}