import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Wajib ada supaya session login pelanggan (di /login, /akun) tetap
// ke-refresh di setiap request server-side.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
