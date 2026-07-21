import { createServiceRoleClient } from "@/lib/supabase/server";
import TransaksiClient from "./TransaksiClient";

const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;
const ALL_STATUSES = ["menunggu_validasi", "diproses", "selesai", "dibatalkan"] as const;

export default async function AdminTransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; size?: string; metode?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "menunggu_validasi";
  const metode = params.metode ?? "semua"; // "semua" | "doku" | "manual"
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() ?? "";

  const requestedSize = Number(params.size);
  const pageSize = ALLOWED_PAGE_SIZES.includes(requestedSize as (typeof ALLOWED_PAGE_SIZES)[number])
    ? requestedSize
    : DEFAULT_PAGE_SIZE;

  const supabase = createServiceRoleClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  function applyMetodeFilter<T extends { eq: any; in: any }>(qb: T) {
    if (metode === "doku") return qb.eq("metode_bayar", "doku");
    if (metode === "manual") return qb.in("metode_bayar", ["tunai", "transfer"]);
    return qb;
  }

  let query = supabase
    .from("orders")
    .select(
      "id, nomor_order, customer_id, guest_nama, guest_no_hp, status_pesanan, status_pembayaran, metode_bayar, total_jual, created_at, customers(nama)",
      { count: "exact" }
    )
    .eq("channel", "online")
    .order("created_at", { ascending: false })
    .range(from, to);

  query = applyMetodeFilter(query);

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
      let cq = supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("channel", "online")
        .eq("status_pesanan", s);
      cq = applyMetodeFilter(cq);
      const { count: c } = await cq;
      return [s, c ?? 0] as const;
    })
  );
  const statusCounts = Object.fromEntries(countsEntries) as Record<string, number>;
  const semuaCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const [{ count: dokuCount }, { count: manualCount }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("channel", "online")
      .eq("metode_bayar", "doku"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("channel", "online")
      .in("metode_bayar", ["tunai", "transfer"]),
  ]);

  return (
    <TransaksiClient
      orders={(orders ?? []) as any}
      totalCount={count ?? 0}
      pageSize={pageSize}
      currentPage={page}
      currentStatus={status}
      currentQuery={q}
      currentMetode={metode}
      statusCounts={{ ...statusCounts, semua: semuaCount }}
      metodeCounts={{ doku: dokuCount ?? 0, manual: manualCount ?? 0 }}
    />
  );
}