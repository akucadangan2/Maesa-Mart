import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import KasirClient from "./KasirClient";

export default async function KasirPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kasir/login");

  const service = createServiceRoleClient();
  const { data: staffRow } = await service
    .from("staff")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!staffRow || !staffRow.is_aktif) redirect("/kasir/login");

  return <KasirClient staffId={staffRow.id} staffNama={staffRow.nama} />;
}