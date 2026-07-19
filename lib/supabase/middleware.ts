import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function matchRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/");
}

const ADMIN_ROUTE_RULES: { route: string; roles: string[] }[] = [
  { route: "/admin/laporan-kasir", roles: ["super_admin", "admin"] },
  { route: "/admin/laporan", roles: ["super_admin"] },
  { route: "/admin/harga-produk", roles: ["super_admin", "admin"] },
  { route: "/admin/produk", roles: ["super_admin"] },
  { route: "/admin/kategori", roles: ["super_admin", "admin"] },
  { route: "/admin/barcode", roles: ["super_admin", "admin"] },
  { route: "/admin/supplier", roles: ["super_admin", "admin"] },
  { route: "/admin/pembelian", roles: ["super_admin", "admin"] },
  { route: "/admin/pengeluaran", roles: ["super_admin", "admin"] },
  { route: "/admin/transaksi", roles: ["super_admin", "admin"] },
  { route: "/admin/qr", roles: ["super_admin"] },
  { route: "/admin/bank", roles: ["super_admin"] },
  { route: "/admin/pengguna", roles: ["super_admin"] },
];

function getAllowedRolesForAdminPath(pathname: string): string[] {
  if (pathname === "/admin") return ["super_admin", "admin"];
  for (const rule of ADMIN_ROUTE_RULES) {
    if (matchRoute(pathname, rule.route)) return rule.roles;
  }
  return ["super_admin"]; // default aman buat halaman /admin/** yang belum terdaftar
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const role = user?.app_metadata?.role as string | undefined;

  const isAdminRoute = path.startsWith("/admin");
  const isAdminLoginRoute = path === "/admin/login";

  if (isAdminRoute && !isAdminLoginRoute) {
    const allowedRoles = getAllowedRolesForAdminPath(path);
    if (!role || !allowedRoles.includes(role)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  const isKasirRoute = path.startsWith("/kasir");
  const isKasirLoginRoute = path === "/kasir/login";

  if (isKasirRoute && !isKasirLoginRoute) {
    const isStaff = role === "super_admin" || role === "admin" || role === "kasir";
    if (!isStaff) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/kasir/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}