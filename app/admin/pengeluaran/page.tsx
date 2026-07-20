import { createServiceRoleClient } from "@/lib/supabase/server";
import PengeluaranClient from "./PengeluaranClient";

export default async function AdminPengeluaranPage() {
  const supabase = createServiceRoleClient();
  const { data: suppliers } = await supabase.from("suppliers").select("*").order("nama");

  return <PengeluaranClient suppliers={suppliers ?? []} />;
}