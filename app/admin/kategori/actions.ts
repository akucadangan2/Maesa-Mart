"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCategory(formData: FormData) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("categories").insert({
    nama: formData.get("nama"),
    urutan: Number(formData.get("urutan")),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/kategori");
  revalidatePath("/order");
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("categories")
    .update({
      nama: formData.get("nama"),
      urutan: Number(formData.get("urutan")),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/kategori");
  revalidatePath("/order");
}

export async function deleteCategory(id: string) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    // Biasanya gagal karena masih ada produk yang pakai kategori ini
    // (products.category_id references categories, on delete restrict)
    throw new Error(
      "Gagal hapus. Kemungkinan masih ada produk yang pakai kategori ini, pindahkan dulu produknya."
    );
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/order");
}