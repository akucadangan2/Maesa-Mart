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
    if (error.code === "23503") {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id);

      throw new Error(
        `Gak bisa dihapus, masih ada ${count ?? "beberapa"} produk yang pakai kategori ini. Pindahkan dulu produknya ke kategori lain lewat halaman Produk (Edit > ganti Kategori), baru coba hapus lagi.`
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/order");
}