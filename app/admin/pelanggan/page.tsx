import { createServiceRoleClient } from "@/lib/supabase/server";
import PelangganClient from "./PelangganClient";

const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

export default async function AdminPelangganPage({
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
    .from("v_customer_summary")
    .select("*", { count: "exact" })
    .order("total_belanja", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`nama.ilike.%${q}%,no_hp.ilike.%${q}%`);
  }

  const { data: customers, count } = await query;

  return (
    <PelangganClient
      customers={customers ?? []}
      totalCount={count ?? 0}
      pageSize={pageSize}
      currentPage={page}
      currentQuery={q}
    />
  );
}