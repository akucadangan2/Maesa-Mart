import { createServiceRoleClient } from "@/lib/supabase/server";
import ProdukClient from "./ProdukClient";

const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

export default async function AdminProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() ?? "";

  const requestedSize = Number(params.size);
  const pageSize = ALLOWED_PAGE_SIZES.includes(requestedSize as (typeof ALLOWED_PAGE_SIZES)[number])
    ? requestedSize
    : DEFAULT_PAGE_SIZE;

  const supabase = createServiceRoleClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`nama.ilike.%${q}%,kode_barcode.ilike.%${q}%`);
  }

  const [{ data: products, count }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("*").order("urutan"),
  ]);

  return (
    <ProdukClient
      initialProducts={products ?? []}
      categories={categories ?? []}
      totalCount={count ?? 0}
      pageSize={pageSize}
      currentPage={page}
      currentQuery={q}
    />
  );
}