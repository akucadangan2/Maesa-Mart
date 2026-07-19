"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSupplier(formData: FormData) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("suppliers").insert({
    nama: formData.get("nama"),
    alamat: (formData.get("alamat") as string) || null,
    telepon: (formData.get("telepon") as string) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/supplier");
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("suppliers")
    .update({
      nama: formData.get("nama"),
      alamat: (formData.get("alamat") as string) || null,
      telepon: (formData.get("telepon") as string) || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/supplier");
}

export async function deleteSupplier(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) {
    throw new Error(
      "Gagal hapus. Kemungkinan masih ada riwayat pembelian yang pakai supplier ini."
    );
  }

  revalidatePath("/admin/supplier");
}