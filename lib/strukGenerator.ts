// lib/strukGenerator.ts
// Desktop: buka jendela print browser otomatis (siap kirim ke printer struk/thermal).
// Mobile: tetap download PNG kayak sebelumnya, karena mobile gak bisa diarahkan
// ke printer fisik langsung dari browser.

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

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let cachedLogoDataUrl: string | null | undefined;

async function getLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;
  try {
    const res = await fetch("/866x288.png");
    const blob = await res.blob();
    cachedLogoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Gagal baca logo"));
      reader.readAsDataURL(blob);
    });
  } catch {
    cachedLogoDataUrl = null;
  }
  return cachedLogoDataUrl;
}

async function buildStrukHtml(order: StrukOrder) {
  const logoDataUrl = await getLogoDataUrl();

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.nama)} x${item.qty}</td>
          <td style="text-align:right;white-space:nowrap;">Rp${item.subtotal.toLocaleString("id-ID")}</td>
        </tr>`
    )
    .join("");

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" style="max-width:100%;height:auto;margin-bottom:6px;" />`
    : `<div style="font-weight:bold;font-size:16px;">Maesa Mart</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Struk ${escapeHtml(order.nomor_order)}</title>
  <style>
    @page { size: 58mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: 52mm;
      margin: 0;
      padding: 0;
      color: #000;
    }
    .center { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    td { padding: 2px 0; vertical-align: top; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .total-row td { font-weight: bold; font-size: 13px; padding-top: 4px; }
    .meta { font-size: 10px; }
  </style>
</head>
<body>
  <div class="center">${logoHtml}</div>
  <div class="meta">
    ${escapeHtml(order.nomor_order)}<br/>
    ${new Date(order.created_at).toLocaleString("id-ID")}
  </div>
  <hr/>
  <table>${itemsHtml}</table>
  <hr/>
  <table>
    <tr class="total-row">
      <td>Total</td>
      <td style="text-align:right;">Rp${order.total_jual.toLocaleString("id-ID")}</td>
    </tr>
  </table>
  <div class="meta">Metode: ${escapeHtml(order.metode_bayar)}</div>
  <div class="meta">Status: ${escapeHtml(labelPesanan[order.status_pesanan] ?? order.status_pesanan)}</div>
  <hr/>
  <div class="center">Terima kasih sudah belanja di Maesa Mart</div>
</body>
</html>`;
}

function printHtmlViaIframe(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (win) {
    win.onafterprint = cleanup;
  }

  // Fallback kalau event onafterprint gak kepanggil (beberapa browser gak konsisten)
  setTimeout(cleanup, 8000);

  setTimeout(() => {
    win?.focus();
    win?.print();
  }, 300);
}

// ===== Fungsi untuk struk PNG (dipakai khusus mobile) =====
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

async function downloadStrukPng(order: StrukOrder) {
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

/**
 * Dipakai di semua tempat (kasir, riwayat, akun) sama seperti sebelumnya, nama &
 * signature-nya gak berubah jadi gak perlu ubah kode yang manggil fungsi ini.
 * Desktop -> buka dialog print browser otomatis (siap kirim ke printer struk).
 * Mobile -> tetap download PNG.
 */
export async function downloadStruk(order: StrukOrder) {
  if (isMobileDevice()) {
    await downloadStrukPng(order);
    return;
  }

  const html = await buildStrukHtml(order);
  printHtmlViaIframe(html);
}