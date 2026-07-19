"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createStaff(formData: FormData) {
  const supabase = createServiceRoleClient();

  const nama = formData.get("nama") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Gagal membuat akun.");
  }

  const { error: profileError } = await supabase.from("staff").insert({
    id: data.user.id,
    nama,
    email,
    role,
    is_aktif: true,
  });

  if (profileError) {
    throw new Error("Akun dibuat, tapi gagal menyimpan profil: " + profileError.message);
  }

  revalidatePath("/admin/pengguna");
}

export async function updateStaff(
  id: string,
  formData: FormData
) {
  const supabase = createServiceRoleClient();

  const nama = formData.get("nama") as string;
  const role = formData.get("role") as string;
  const newPassword = (formData.get("password") as string) || null;

  // Sinkronkan role ke app_metadata (yang dipakai middleware buat cek akses),
  // gabung dengan app_metadata lain yang mungkin sudah ada, bukan menimpa semua.
  const { data: existingUser } = await supabase.auth.admin.getUserById(id);
  const currentAppMetadata = existingUser?.user?.app_metadata ?? {};

  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    app_metadata: { ...currentAppMetadata, role },
    ...(newPassword ? { password: newPassword } : {}),
  });

  if (authError) throw new Error(authError.message);

  const { error } = await supabase.from("staff").update({ nama, role }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/pengguna");
}

export async function toggleStaffActive(id: string, isAktif: boolean) {
  const supabase = createServiceRoleClient();

  // ban_duration "none" = aktifkan kembali, durasi panjang = nonaktifkan login
  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: isAktif ? "none" : "876000h",
  });

  if (authError) throw new Error(authError.message);

  const { error } = await supabase.from("staff").update({ is_aktif: isAktif }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/pengguna");
}

export async function deleteStaff(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/pengguna");
}