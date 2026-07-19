import { createServiceRoleClient } from "@/lib/supabase/server";
import PenggunaClient from "./PenggunaClient";

export default async function AdminPenggunaPage() {
  const supabase = createServiceRoleClient();

  const { data: staff } = await supabase.from("staff").select("*").order("created_at");

  return <PenggunaClient initialStaff={staff ?? []} />;
}