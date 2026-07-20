// lib/strukGenerator.ts
// Generate & download struk belanja sebagai PNG. Dipakai di /riwayat dan /akun.

interface StrukItem {
  nama: string;
  qty: number;
  subtotal: number;
}

interface StrukOrder {
  nomor_order: string;
  created_at: string;
  metode_bayar: string;
  status_pesanan: string;
  total_jual: number;
  items: StrukItem[];
}

const labelPesanan: Record<string, string> = {
  menunggu_validasi: "Menunggu Validasi",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

function drawDashedLine(ctx: CanvasRenderingContext2D, y: number, width: number, padding: number) {
  ctx.save();
  ctx.strokeStyle = "#DCE3D8";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  ctx.restore();
}

export async function downloadStruk(order: StrukOrder) {
  const width = 400;
  const padding = 24;
  const lineHeight = 20;
  const headerHeight = 90;
  const itemsHeight = order.items.length * lineHeight;
  const footerHeight = 140;
  const height = headerHeight + itemsHeight + footerHeight;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  const logo = new Image();
  logo.src = "/866x288.png";
  await new Promise((resolve) => {
    logo.onload = resolve;
    logo.onerror = resolve;
  });

  let y = 20;

  if (logo.complete && logo.naturalWidth > 0) {
    const logoW = 160;
    const logoH = (logo.naturalHeight / logo.naturalWidth) * logoW;
    ctx.drawImage(logo, (width - logoW) / 2, y, logoW, logoH);
    y += logoH + 14;
  } else {
    ctx.fillStyle = "#1E56A0";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Maesa Mart", width / 2, y + 18);
    y += 36;
  }

  ctx.font = "12px 'Courier New', monospace";
  ctx.fillStyle = "#1B2420";
  ctx.textAlign = "left";
  ctx.fillText(order.nomor_order, padding, y);
  ctx.textAlign = "right";
  ctx.fillText(new Date(order.created_at).toLocaleString("id-ID"), width - padding, y);
  y += 18;

  drawDashedLine(ctx, y, width, padding);
  y += 20;

  ctx.font = "12px 'Courier New', monospace";
  for (const item of order.items) {
    ctx.textAlign = "left";
    ctx.fillText(`${item.nama} x${item.qty}`, padding, y);
    ctx.textAlign = "right";
    ctx.fillText(`Rp${item.subtotal.toLocaleString("id-ID")}`, width - padding, y);
    y += lineHeight;
  }

  drawDashedLine(ctx, y, width, padding);
  y += 22;

  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("Total", padding, y);
  ctx.textAlign = "right";
  ctx.fillText(`Rp${order.total_jual.toLocaleString("id-ID")}`, width - padding, y);
  y += 26;

  ctx.font = "11px 'Courier New', monospace";
  ctx.fillStyle = "#5B6660";
  ctx.textAlign = "left";
  ctx.fillText(`Metode: ${order.metode_bayar}`, padding, y);
  y += 16;
  ctx.fillText(`Status: ${labelPesanan[order.status_pesanan] ?? order.status_pesanan}`, padding, y);
  y += 32;

  ctx.textAlign = "center";
  ctx.fillText("Terima kasih sudah belanja di Maesa Mart", width / 2, y);

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `struk-${order.nomor_order}.png`;
  a.click();
}