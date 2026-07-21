// lib/strukGenerator.ts
// Desktop: buka jendela print browser otomatis (siap kirim ke printer struk/thermal).
// Mobile: tetap download PNG kayak sebelumnya, karena mobile gak bisa diarahkan
// ke printer fisik langsung dari browser.

const STORE_NAME = "MAESA MART";
const STORE_ADDRESS_LINE1 = "Jl. Trans Sulawesi Desa Mokupa Jaga 6";
const STORE_ADDRESS_LINE2 = "Kec. Tombariri Kab. Minahasa";
const STORE_PHONE = "085255572001";

const STRUK_WIDTH_KEY = "maesa_struk_lebar_mm";
const DEFAULT_WIDTH_MM = 58;

export function getStrukWidthMm(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH_MM;
  const saved = window.localStorage.getItem(STRUK_WIDTH_KEY);
  const parsed = Number(saved);
  return parsed > 0 ? parsed : DEFAULT_WIDTH_MM;
}

export function setStrukWidthMm(mm: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STRUK_WIDTH_KEY, String(mm));
}

interface StrukItem {
  nama: string;
  qty: number;
  subtotal: number;
  satuan?: string;
  harga_satuan?: number;
}

interface StrukOrder {
  nomor_order: string;
  created_at: string;
  metode_bayar: string;
  status_pesanan: string;
  total_jual: number;
  items: StrukItem[];
  kasir_nama?: string | null;
  nama_pembeli?: string | null;
  detail_bayar?: string | null;
  no_referensi?: string | null;
}

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

function angka(n: number) {
  return Math.round(n).toLocaleString("id-ID");
}

function labelMetodeBayar(order: StrukOrder) {
  if (order.detail_bayar && order.detail_bayar.trim()) return order.detail_bayar.trim();
  const map: Record<string, string> = {
    tunai: "Tunai",
    kartu: "Kartu",
    transfer: "Transfer",
    ewallet: "E-Wallet",
    doku: "Online",
  };
  return map[order.metode_bayar] ?? order.metode_bayar;
}

async function buildStrukHtml(order: StrukOrder, widthMm: number) {
  const contentWidthMm = Math.max(30, widthMm - 6);
  const tgl = new Date(order.created_at);
  const tanggalStr = tgl.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  const jamStr = tgl.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const itemsHtml = order.items
    .map((item) => {
      const satuanTxt = item.satuan ? ` ${escapeHtml(item.satuan)}` : "";
      const hargaTxt = item.harga_satuan != null ? angka(item.harga_satuan) : "";
      return `
        <div style="margin-bottom:3px;">
          <div>${escapeHtml(item.nama)}</div>
          <div style="display:flex; justify-content:space-between;">
            <span>${item.qty}${satuanTxt}${hargaTxt ? "   " + hargaTxt : ""}</span>
            <span>${angka(item.subtotal)}</span>
          </div>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Struk ${escapeHtml(order.nomor_order)}</title>
  <style>
    @page { size: ${widthMm}mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: ${contentWidthMm}mm;
      margin: 0;
      padding: 0;
      color: #000;
    }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; }
    hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="center" style="font-weight:bold;">${STORE_NAME}</div>
  <div class="center">${STORE_ADDRESS_LINE1}</div>
  <div class="center">${STORE_ADDRESS_LINE2}</div>
  <div class="center">${STORE_PHONE}</div>
  <hr/>
  <div>No. &nbsp;&nbsp;&nbsp;: ${escapeHtml(order.nomor_order)}</div>
  <div class="row"><span>Kasir &nbsp;: ${escapeHtml(order.kasir_nama ?? "-")}</span><span>${tanggalStr}</span></div>
  <div class="row"><span>Pel. &nbsp;&nbsp;: ${escapeHtml(order.nama_pembeli ?? "Umum")}</span><span>${jamStr}</span></div>
  <hr/>
  ${itemsHtml}
  <hr/>
  <div class="row" style="font-weight:bold;"><span>Total</span><span>${angka(order.total_jual)}</span></div>
  <div class="row"><span>Metode bayar:</span><span>${escapeHtml(labelMetodeBayar(order))}</span></div>
  <div class="row"><span>No. Referensi:</span><span>${escapeHtml(order.no_referensi ?? "")}</span></div>
  <hr/>
  <div class="center">Terimakasih atas kunjunganya</div>
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

  setTimeout(cleanup, 8000);

  setTimeout(() => {
    win?.focus();
    win?.print();
  }, 300);
}

async function downloadStrukPng(order: StrukOrder) {
  const width = 400;
  const padding = 24;
  const lineHeight = 16;
  const itemBlockHeight = order.items.length * (lineHeight * 2 + 4);
  const headerHeight = 110;
  const footerHeight = 130;
  const height = headerHeight + itemBlockHeight + footerHeight;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1B2420";

  let y = 24;
  ctx.textAlign = "center";
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.fillText(STORE_NAME, width / 2, y);
  y += 16;
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText(STORE_ADDRESS_LINE1, width / 2, y);
  y += 14;
  ctx.fillText(STORE_ADDRESS_LINE2, width / 2, y);
  y += 14;
  ctx.fillText(STORE_PHONE, width / 2, y);
  y += 18;

  const tgl = new Date(order.created_at);
  const tanggalStr = tgl.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  const jamStr = tgl.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  ctx.textAlign = "left";
  ctx.fillText(`No.   : ${order.nomor_order}`, padding, y);
  y += lineHeight;
  ctx.fillText(`Kasir : ${order.kasir_nama ?? "-"}`, padding, y);
  ctx.textAlign = "right";
  ctx.fillText(tanggalStr, width - padding, y);
  y += lineHeight;
  ctx.textAlign = "left";
  ctx.fillText(`Pel.  : ${order.nama_pembeli ?? "Umum"}`, padding, y);
  ctx.textAlign = "right";
  ctx.fillText(jamStr, width - padding, y);
  y += 10;

  ctx.strokeStyle = "#999";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 16;

  ctx.setLineDash([]);
  for (const item of order.items) {
    ctx.textAlign = "left";
    ctx.fillText(item.nama, padding, y);
    y += lineHeight;
    const satuanTxt = item.satuan ? ` ${item.satuan}` : "";
    const hargaTxt = item.harga_satuan != null ? `   ${angka(item.harga_satuan)}` : "";
    ctx.fillText(`${item.qty}${satuanTxt}${hargaTxt}`, padding, y);
    ctx.textAlign = "right";
    ctx.fillText(angka(item.subtotal), width - padding, y);
    y += lineHeight + 4;
  }

  ctx.strokeStyle = "#999";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 18;

  ctx.setLineDash([]);
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("Total", padding, y);
  ctx.textAlign = "right";
  ctx.fillText(angka(order.total_jual), width - padding, y);
  y += lineHeight + 4;

  ctx.font = "11px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("Metode bayar:", padding, y);
  ctx.textAlign = "right";
  ctx.fillText(labelMetodeBayar(order), width - padding, y);
  y += lineHeight;

  ctx.textAlign = "left";
  ctx.fillText("No. Referensi:", padding, y);
  ctx.textAlign = "right";
  ctx.fillText(order.no_referensi ?? "", width - padding, y);
  y += 20;

  ctx.textAlign = "center";
  ctx.fillText("Terimakasih atas kunjunganya", width / 2, y);

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `struk-${order.nomor_order}.png`;
  a.click();
}

/**
 * Dipakai di semua tempat (kasir, riwayat, akun) sama seperti sebelumnya, nama &
 * signature-nya gak berubah jadi gak perlu ubah kode yang manggil fungsi ini,
 * cuma sekarang menerima beberapa field opsional tambahan (kasir_nama,
 * nama_pembeli, detail_bayar, no_referensi).
 */
export async function downloadStruk(order: StrukOrder) {
  if (isMobileDevice()) {
    await downloadStrukPng(order);
    return;
  }

  const widthMm = getStrukWidthMm();
  const html = await buildStrukHtml(order, widthMm);
  printHtmlViaIframe(html);
}