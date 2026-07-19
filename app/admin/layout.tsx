"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "./logout-button";

interface MenuItem {
  href: string;
  label: string;
  showBadge?: boolean;
  superAdminOnly?: boolean;
  external?: boolean;
  highlight?: boolean;
}

interface MenuGroup {
  title: string | null;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: null,
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/kasir", label: "Buka Kasir ↗", external: true, highlight: true },
    ],
  },
  {
    title: "Master",
    items: [
      { href: "/admin/kategori", label: "Kategori" },
      { href: "/admin/supplier", label: "Data Supplier" },
      { href: "/admin/bank", label: "Rekening Bank", superAdminOnly: true },
    ],
  },
  {
    title: "Produk",
    items: [
      { href: "/admin/produk", label: "Produk", superAdminOnly: true },
      { href: "/admin/harga-produk", label: "Harga Produk" },
      { href: "/admin/barcode", label: "Cetak Barcode" },
    ],
  },
  {
    title: "Pembelian",
    items: [
      { href: "/admin/pembelian", label: "Transaksi Baru" },
      { href: "/admin/pembelian/riwayat", label: "Data Pembelian" },
    ],
  },
  {
    title: "Penjualan",
    items: [{ href: "/admin/transaksi", label: "Transaksi Online", showBadge: true }],
  },
  {
    title: "Pengeluaran",
    items: [
      { href: "/admin/pengeluaran", label: "Pengeluaran Baru" },
      { href: "/admin/pengeluaran/riwayat", label: "Data Pengeluaran" },
    ],
  },
  {
    title: "Laporan",
    items: [
      { href: "/admin/laporan", label: "Laporan Keuntungan", superAdminOnly: true },
      { href: "/admin/laporan-kasir", label: "Laporan Kasir" },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { href: "/admin/qr", label: "Link & QR Toko", superAdminOnly: true },
      { href: "/admin/pengguna", label: "Data User", superAdminOnly: true },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") return;

    supabase.auth.getUser().then(({ data }) => {
      setRole((data.user?.app_metadata?.role as string) ?? null);
    });

    async function loadCount() {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status_pesanan", "menunggu_validasi")
        .eq("channel", "online");
      setPendingCount(count ?? 0);
    }
    loadCount();

    const channel = supabase
      .channel("orders-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  function checkScrollable() {
    const el = scrollRef.current;
    if (!el) return;
    const hasMoreBelow = el.scrollHeight - el.scrollTop - el.clientHeight > 8;
    setShowScrollHint(hasMoreBelow);
  }

  useEffect(() => {
    checkScrollable();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScrollable);
    window.addEventListener("resize", checkScrollable);
    return () => {
      el.removeEventListener("scroll", checkScrollable);
      window.removeEventListener("resize", checkScrollable);
    };
  }, [role, pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const isSuperAdmin = role === "super_admin";

  return (
    <div className="min-h-screen">
      <div className="md:hidden sticky top-0 z-30 bg-gray-900 text-white flex items-center justify-between px-4 py-3">
        <span className="font-bold">Maesa Mart Admin</span>
        <button onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
          <Menu size={22} />
        </button>
      </div>

      <div className="flex">
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="font-bold text-lg">Maesa Mart Admin</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-white/70"
              aria-label="Tutup menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative flex-1 min-h-0">
            <div ref={scrollRef} className="h-full overflow-y-auto px-4 pb-2">
              {menuGroups.map((group, gi) => {
                const visibleItems = group.items.filter((item) => !item.superAdminOnly || isSuperAdmin);
                if (visibleItems.length === 0) return null;

                return (
                  <div key={gi} className={gi > 0 ? "mt-3 pt-3 border-t border-white/10" : ""}>
                    {group.title && (
                      <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                        {group.title}
                      </div>
                    )}
                    <div className="space-y-1">
                      {visibleItems.map((item) => {
                        const active = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            target={item.external ? "_blank" : undefined}
                            rel={item.external ? "noopener noreferrer" : undefined}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-sm ${
                              item.highlight
                                ? "bg-brand font-medium"
                                : active
                                ? "bg-white/10 font-medium"
                                : "text-white/80"
                            }`}
                          >
                            <span>{item.label}</span>
                            {item.showBadge && pendingCount > 0 && (
                              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-orange-500 text-white text-[11px] font-semibold">
                                {pendingCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {showScrollHint && (
              <div className="pointer-events-none absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-gray-900 to-transparent flex items-end justify-center pb-1">
                <ChevronDown size={16} className="text-white/50 animate-bounce" />
              </div>
            )}
          </div>

          <div className="px-4 pt-3 pb-4 border-t border-white/10">
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen w-full">{children}</main>
      </div>
    </div>
  );
}