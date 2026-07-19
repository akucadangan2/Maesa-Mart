import { createServiceRoleClient } from "@/lib/supabase/server";
import SupplierClient from "./SupplierClient";

export default async function AdminSupplierPage() {
  const supabase = createServiceRoleClient();

  const { data: suppliers } = await supabase.from("suppliers").select("*").order("nama");

  return <SupplierClient initialSuppliers={suppliers ?? []} />;
}