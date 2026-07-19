import { createClient } from "@/lib/supabase/server";

export async function requireStaffRole(allowedRoles: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role as string | undefined;

  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Kamu tidak punya akses untuk melakukan ini.");
  }

  return { userId: user!.id, role };
}