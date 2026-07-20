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
}

interface MenuGroup {
  title: string | null;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  { title: null, items: [{ href: "/admin", label: "Dashboard" }] },
  {
    title: "Master",
    items: [
      { href: "/admin/kategori", label: "Kategori" },
      { href: "/admin/supplier", label: "Data Supplier" },
      { href: "/admin/pelanggan", label: "Data Pelanggan", superAdminOnly: true },
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
  const navRef = useRef<HTMLDivElement>(null);

  const [role, setRole] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

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
    setOpenGroup(null);
    setMobileOpen(false);
  }, [pathname]);

  // Tutup dropdown desktop kalau klik di luar area nav
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const isSuperAdmin = role === "super_admin";

  function isGroupActive(group: MenuGroup) {
    return group.items.some((item) => pathname === item.href);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-bold text-brand whitespace-nowrap">Maesa Mart Admin</span>

            <nav ref={navRef} className="hidden md:flex items-center gap-1 relative">
              {menuGroups.map((group, gi) => {
                const visibleItems = group.items.filter((item) => !item.superAdminOnly || isSuperAdmin);
                if (visibleItems.length === 0) return null;

                // Grup tanpa title (Dashboard) -> link langsung, bukan dropdown
                if (!group.title) {
                  const item = visibleItems[0];
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={gi}
                      href={item.href}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        active ? "bg-brand/10 text-brand" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                }

                const active = isGroupActive(group);
                const groupHasBadge = visibleItems.some((it) => it.showBadge) && pendingCount > 0;

                return (
                  <div key={gi} className="relative">
                    <button
                      onClick={() => setOpenGroup(openGroup === group.title ? null : group.title)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${
                        active ? "bg-brand/10 text-brand" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {group.title}
                      {groupHasBadge && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      )}
                      <ChevronDown size={14} />
                    </button>

                    {openGroup === group.title && (
                      <div className="absolute left-0 mt-1 w-56 bg-white border rounded-lg shadow-lg py-1 z-40">
                        {visibleItems.map((item) => {
                          const itemActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center justify-between px-3 py-2 text-sm ${
                                itemActive ? "bg-brand/10 text-brand" : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <span>{item.label}</span>
                              {item.showBadge && pendingCount > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-semibold">
                                  {pendingCount}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/kasir"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block bg-brand text-white rounded-lg px-3 py-1.5 text-sm font-medium"
            >
              Buka Kasir ↗
            </Link>
            <div className="hidden md:block">
              <LogoutButton />
            </div>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden text-gray-600"
              aria-label="Buka menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Panel menu mobile */}
        {mobileOpen && (
          <div className="md:hidden border-t max-h-[75vh] overflow-y-auto">
            {menuGroups.map((group, gi) => {
              const visibleItems = group.items.filter((item) => !item.superAdminOnly || isSuperAdmin);
              if (visibleItems.length === 0) return null;

              if (!group.title) {
                const item = visibleItems[0];
                return (
                  <Link
                    key={gi}
                    href={item.href}
                    className="block px-4 py-3 text-sm font-medium border-b"
                  >
                    {item.label}
                  </Link>
                );
              }

              const expanded = mobileExpanded === group.title;
              return (
                <div key={gi} className="border-b">
                  <button
                    onClick={() => setMobileExpanded(expanded ? null : group.title)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
                  >
                    {group.title}
                    <ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
                  </button>
                  {expanded && (
                    <div className="bg-gray-50">
                      {visibleItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center justify-between px-6 py-2.5 text-sm text-gray-600"
                        >
                          <span>{item.label}</span>
                          {item.showBadge && pendingCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-semibold">
                              {pendingCount}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="p-4 space-y-2">
              <Link
                href="/kasir"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-brand text-white rounded-lg py-2 text-sm font-medium"
              >
                Buka Kasir ↗
              </Link>
              <LogoutButton />
            </div>
          </div>
        )}
      </header>

      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}