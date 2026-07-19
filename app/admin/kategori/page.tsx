import { createServiceRoleClient } from "@/lib/supabase/server";
import KategoriClient from "./KategoriClient";

export default async function AdminKategoriPage() {
  const supabase = createServiceRoleClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("urutan");

  return <KategoriClient initialCategories={categories ?? []} />;
}