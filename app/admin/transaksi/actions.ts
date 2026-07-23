"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { StatusPesanan, StatusPembayaran } from "@/lib/types";
import { awardPoinUntukOrder } from "@/app/kasir/membershipActions";

export async function updateStatusPesanan(id: string, status: StatusPesanan) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("orders").update({ status_pesanan: status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/transaksi");
}

export async function updateStatusPembayaran(id: string, status: StatusPembayaran) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("orders")
    .update({ status_pembayaran: status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (status === "lunas") {
    await awardPoinUntukOrder(id);
  }

  revalidatePath("/admin/transaksi");
}

// Detail lengkap (item, bank, bukti bayar) sengaja BARU di-fetch pas
// admin klik expand satu baris, bukan sekaligus buat semua baris di list.
export async function getOrderDetail(id: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, order_items(*), customers(nama, no_hp), bank_accounts(nama_bank, no_rekening, atas_nama)"
    )
    .eq("id", id)
    .single();

  if (error || !data) throw new Error("Gagal memuat detail pesanan.");
  return data;
}