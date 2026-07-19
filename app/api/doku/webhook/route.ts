import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// TODO:
// 1. Verifikasi signature dari DOKU (pakai DOKU_SECRET_KEY, cocokkan header X-Signature)
// 2. Parse invoice_number / transaction_status dari payload DOKU
// 3. Update orders.status_pembayaran jadi 'lunas' kalau status SUCCESS
// 4. Simpan raw_response ke tabel doku_transactions untuk audit

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const supabase = createServiceRoleClient();

  console.log("DOKU webhook diterima:", payload);

  return NextResponse.json({ received: true });
}
