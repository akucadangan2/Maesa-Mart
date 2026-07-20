"use server";

import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";

const DOKU_BASE_URL = process.env.DOKU_BASE_URL || "https://api-sandbox.doku.com";
const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID!;
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY!;

function isoTimestampNoMillis() {
  return new Date().toISOString().split(".")[0] + "Z";
}

function generateSignature(requestId: string, timestamp: string, target: string, bodyString: string) {
  const digest = crypto.createHash("sha256").update(bodyString).digest("base64");
  const componentSignature =
    `Client-Id:${DOKU_CLIENT_ID}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${target}\n` +
    `Digest:${digest}`;
  const hmac = crypto.createHmac("sha256", DOKU_SECRET_KEY).update(componentSignature).digest("base64");
  return `HMACSHA256=${hmac}`;
}

export async function createDokuPayment(orderId: string): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, nomor_order, total_jual, customers(nama), guest_nama")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Pesanan tidak ditemukan.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const requestId = crypto.randomUUID();
  const timestamp = isoTimestampNoMillis();
  const target = "/checkout/v1/payment";

  const namaCustomer = (order.customers as any)?.nama ?? order.guest_nama ?? "Pelanggan";

  const body = {
    order: {
      amount: Math.round(order.total_jual),
      invoice_number: order.nomor_order,
      callback_url: `${appUrl}/riwayat`,
      callback_url_result: `${appUrl}/riwayat`,
    },
    payment: {
      payment_due_date: 60,
    },
    customer: {
      name: namaCustomer,
    },
    additional_info: {
      override_notification_url: `${appUrl}/api/doku/webhook`,
    },
  };

  const bodyString = JSON.stringify(body);
  const signature = generateSignature(requestId, timestamp, target, bodyString);

  const res = await fetch(`${DOKU_BASE_URL}${target}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": DOKU_CLIENT_ID,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    },
    body: bodyString,
  });

  const data = await res.json();

  if (!res.ok || !data?.response?.payment?.url) {
    console.error("DOKU create payment gagal, status:", res.status);
    console.error("DOKU response:", JSON.stringify(data));
    throw new Error(
      "Gagal membuat pembayaran DOKU: " +
        (data?.error_messages?.join(", ") ?? data?.message?.join?.(", ") ?? JSON.stringify(data))
    );
  }

  await supabase.from("doku_transactions").insert({
    order_id: orderId,
    doku_invoice_number: order.nomor_order,
    doku_ref: data.response.payment.token_id,
    status: "PENDING",
    payment_url: data.response.payment.url,
    raw_response: data,
  });

  return data.response.payment.url as string;
}