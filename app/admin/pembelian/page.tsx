import { createServiceRoleClient } from "@/lib/supabase/server";
import PembelianClient from "./PembelianClient";

export default async function AdminPembelianPage() {
  const supabase = createServiceRoleClient();
  const { data: suppliers } = await supabase.from("suppliers").select("*").order("nama");

  return <PembelianClient suppliers={suppliers ?? []} />;
}