import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { awardPoinUntukOrder } from "@/app/kasir/membershipActions";

const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY!;

function verifySignature(params: {
  clientId: string;
  requestId: string;
  timestamp: string;
  target: string;
  bodyString: string;
  receivedSignature: string;
}) {
  const digest = crypto.createHash("sha256").update(params.bodyString).digest("base64");
  const componentSignature =
    `Client-Id:${params.clientId}\n` +
    `Request-Id:${params.requestId}\n` +
    `Request-Timestamp:${params.timestamp}\n` +
    `Request-Target:${params.target}\n` +
    `Digest:${digest}`;
  const expectedHmac = crypto
    .createHmac("sha256", DOKU_SECRET_KEY)
    .update(componentSignature)
    .digest("base64");
  return `HMACSHA256=${expectedHmac}` === params.receivedSignature;
}

export async function POST(request: NextRequest) {
  const bodyString = await request.text();
  const clientId = request.headers.get("Client-Id") ?? "";
  const requestId = request.headers.get("Request-Id") ?? "";
  const timestamp = request.headers.get("Request-Timestamp") ?? "";
  const receivedSignature = request.headers.get("Signature") ?? "";
  const target = "/api/doku/webhook";

  const isValid = verifySignature({
    clientId,
    requestId,
    timestamp,
    target,
    bodyString,
    receivedSignature,
  });

  if (!isValid) {
    console.warn("DOKU webhook: signature gak valid, ditolak.");
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(bodyString);
  const invoiceNumber = payload?.order?.invoice_number;
  const transactionStatus = payload?.transaction?.status;

  if (!invoiceNumber) {
    return NextResponse.json({ message: "Missing invoice number" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("nomor_order", invoiceNumber)
    .single();

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  await supabase
    .from("doku_transactions")
    .update({ status: transactionStatus, raw_response: payload })
    .eq("order_id", order.id);

  if (transactionStatus === "SUCCESS") {
    await supabase.from("orders").update({ status_pembayaran: "lunas" }).eq("id", order.id);
    await awardPoinUntukOrder(order.id);
  } else if (transactionStatus === "FAILED" || transactionStatus === "EXPIRED") {
    await supabase.from("orders").update({ status_pembayaran: "belum_bayar" }).eq("id", order.id);
  }

  return NextResponse.json({ message: ["SUCCESS"] });
}