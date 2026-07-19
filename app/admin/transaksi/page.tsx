import { createServiceRoleClient } from "@/lib/supabase/server";
import TransaksiClient from "./TransaksiClient";

const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;
const ALL_STATUSES = ["menunggu_validasi", "diproses", "selesai", "dibatalkan"] as const;

export default async function AdminTransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; size?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "menunggu_validasi";
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
    .from("orders")
    .select(
      "id, nomor_order, customer_id, guest_nama, guest_no_hp, status_pesanan, status_pembayaran, metode_bayar, total_jual, created_at, customers(nama)",
      { count: "exact" }
    )
    .eq("channel", "online") // Filter khusus online
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "semua") {
    query = query.eq("status_pesanan", status);
  }
  if (q) {
    query = query.or(
      `nomor_order.ilike.%${q}%,guest_nama.ilike.%${q}%,guest_no_hp.ilike.%${q}%`
    );
  }

  const { data: orders, count } = await query;

  const countsEntries = await Promise.all(
    ALL_STATUSES.map(async (s) => {
      const { count: c } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("channel", "online") // Filter khusus online untuk badge jumlah status
        .eq("status_pesanan", s);
      return [s, c ?? 0] as const;
    })
  );
  const statusCounts = Object.fromEntries(countsEntries) as Record<string, number>;
  const semuaCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <TransaksiClient
      orders={orders ?? []}
      totalCount={count ?? 0}
      pageSize={pageSize}
      currentPage={page}
      currentStatus={status}
      currentQuery={q}
      statusCounts={{ ...statusCounts, semua: semuaCount }}
    />
  );
}