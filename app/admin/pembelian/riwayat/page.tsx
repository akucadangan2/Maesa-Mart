import { createServiceRoleClient } from "@/lib/supabase/server";
import RiwayatPembelianClient from "./RiwayatPembelianClient";

export default async function DataPembelianPage() {
  const supabase = createServiceRoleClient();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("*, suppliers(nama), purchase_items(id)")
    .order("created_at", { ascending: false })
    .limit(100);

  return <RiwayatPembelianClient purchases={purchases ?? []} />;
}