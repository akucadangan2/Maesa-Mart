import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AkunClient from "./AkunClient";

const PAGE_SIZE = 10;

export default async function AkunPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customerRow } = await supabase
    .from("customers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!customerRow) {
    // Sesi login ada tapi bukan akun pelanggan (misalnya akun admin nyasar ke sini)
    redirect("/order");
  }

  // Gabungin pesanan lama yang sempat dibuat sebagai tamu (No HP sama)
  // ke akun ini, sebelum ambil riwayat.
  await supabase.rpc("claim_guest_orders");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: orders, count }, { data: favorit }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(*)", { count: "exact" })
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("v_produk_favorit_customer")
      .select("*")
      .eq("customer_id", user.id)
      .order("total_qty_dibeli", { ascending: false })
      .limit(10),
  ]);

  return (
    <AkunClient
      customer={customerRow}
      orders={orders ?? []}
      favorit={favorit ?? []}
      totalCount={count ?? 0}
      pageSize={PAGE_SIZE}
      currentPage={page}
    />
  );
}