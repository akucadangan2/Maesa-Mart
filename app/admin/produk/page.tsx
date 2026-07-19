import { createServiceRoleClient } from "@/lib/supabase/server";
import ProdukClient from "./ProdukClient";

export default async function AdminProdukPage() {
  const supabase = createServiceRoleClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("urutan"),
  ]);

  return <ProdukClient initialProducts={products ?? []} categories={categories ?? []} />;
}