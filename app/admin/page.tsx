import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import Link from "next/link";
import DashboardChart from "./DashboardChart";

function formatTanggal(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminDashboard() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const isSuperAdmin = user?.app_metadata?.role === "super_admin";

  const supabase = createServiceRoleClient();
  const todayStr = formatTanggal(new Date());

  const [
    { data: laporanRows },
    { count: pendingCount },
    { count: produkAktifCount },
    { count: kategoriCount },
    { count: supplierCount },
    { data: stokMenipis },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from("v_laporan_keuntungan_harian")
      .select("*")
      .order("tanggal", { ascending: false })
      .limit(7),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("channel", "online")
      .eq("status_pesanan", "menunggu_validasi"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_aktif", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("suppliers").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id, nama, satuan, stok")
      .eq("is_aktif", true)
      .lte("stok", 5)
      .order("stok", { ascending: true })
      .limit(5),
    supabase
      .from("orders")
      .select("id, nomor_order, channel, total_jual, status_pesanan, created_at, customers(nama), guest_nama")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const rows = laporanRows ?? [];
  const todayRow = rows.find((r) => r.tanggal === todayStr);
  const chartData = rows
    .slice()
    .reverse()
    .map((r) => ({
      label: new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      laba: Number(r.total_laba),
    }));

  const statusLabel: Record<string, string> = {
    menunggu_validasi: "Menunggu Validasi",
    diproses: "Diproses",
    selesai: "Selesai",
    dibatalkan: "Dibatalkan",
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Omzet Hari Ini</div>
          <div className="text-lg font-bold">
            Rp{Number(todayRow?.total_omzet ?? 0).toLocaleString("id-ID")}
          </div>
        </div>
        {isSuperAdmin && (
          <div className="bg-white border rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Laba Hari Ini</div>
            <div className="text-lg font-bold text-brand">
              Rp{Number(todayRow?.total_laba ?? 0).toLocaleString("id-ID")}
            </div>
          </div>
        )}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Produk Aktif</div>
          <div className="text-lg font-bold">{produkAktifCount ?? 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Kategori</div>
          <div className="text-lg font-bold">{kategoriCount ?? 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Supplier</div>
          <div className="text-lg font-bold">{supplierCount ?? 0}</div>
        </div>
        <Link
          href="/admin/transaksi"
          className={`rounded-lg p-4 flex flex-col justify-between ${
            (pendingCount ?? 0) > 0 ? "bg-orange-500 text-white" : "bg-white border"
          }`}
        >
          <div className={`text-xs mb-1 ${(pendingCount ?? 0) > 0 ? "text-white/80" : "text-gray-500"}`}>
            Menunggu Validasi
          </div>
          <div className="text-lg font-bold">{pendingCount ?? 0}</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isSuperAdmin && (
          <div className="lg:col-span-2 bg-white border rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Tren Laba 7 Hari Terakhir</p>
            <DashboardChart data={chartData} />
          </div>
        )}

        <div className={`bg-white border rounded-lg p-4 ${isSuperAdmin ? "" : "lg:col-span-3"}`}>
          <p className="text-sm font-medium mb-3">Stok Menipis</p>
          {stokMenipis && stokMenipis.length > 0 ? (
            <div className="space-y-2">
              {stokMenipis.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.nama}</span>
                  <span className="text-orange-600 font-medium shrink-0 ml-2">
                    {p.stok} {p.satuan}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Semua stok aman.</p>
          )}
          <Link href="/admin/pembelian" className="text-xs text-brand underline block mt-3">
            Tambah stok →
          </Link>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 mt-4">
        <p className="text-sm font-medium mb-3">Aktivitas Terbaru</p>
        {recentOrders && recentOrders.length > 0 ? (
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm border-t first:border-0 pt-2 first:pt-0">
                <div className="min-w-0">
                  <div className="font-mono text-xs">{o.nomor_order}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {o.channel === "pos" ? "Kasir" : (o.customers as any)?.nama ?? o.guest_nama ?? "Tamu"} ·{" "}
                    {new Date(o.created_at).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {o.channel === "online" && (
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      {statusLabel[o.status_pesanan]}
                    </span>
                  )}
                  <span className="font-medium">Rp{o.total_jual.toLocaleString("id-ID")}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Belum ada transaksi.</p>
        )}
      </div>
    </div>
  );
}