"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBankAccount(formData: FormData) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("bank_accounts").insert({
    nama_bank: formData.get("nama_bank"),
    no_rekening: formData.get("no_rekening"),
    atas_nama: formData.get("atas_nama"),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/bank");
  revalidatePath("/order");
}

export async function updateBankAccount(id: string, formData: FormData) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("bank_accounts")
    .update({
      nama_bank: formData.get("nama_bank"),
      no_rekening: formData.get("no_rekening"),
      atas_nama: formData.get("atas_nama"),
      is_aktif: formData.get("is_aktif") === "true",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/bank");
  revalidatePath("/order");
}

export async function deleteBankAccount(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/bank");
  revalidatePath("/order");
}