"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Check } from "lucide-react";

export default function QrClient({ orderUrl }: { orderUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, orderUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#1F5A44", light: "#FFFFFF" },
      });
    }
  }, [orderUrl]);

  function handleCopy() {
    navigator.clipboard.writeText(orderUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "qr-maesa-mart.png";
    a.click();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Link & QR Toko</h1>

      <div className="bg-white border rounded-lg p-6 max-w-md">
        <p className="text-sm text-gray-500 mb-2">
          Dua cara pelanggan bisa buka katalog, keduanya mengarah ke halaman yang sama:
        </p>

        <div className="flex items-center gap-2 mb-6">
          <input
            readOnly
            value={orderUrl}
            className="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 border rounded-lg px-3 py-2 text-sm shrink-0"
          >
            {copied ? <Check size={14} className="text-brand" /> : <Copy size={14} />}
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>

        <div className="flex flex-col items-center border-t pt-6">
          <canvas ref={canvasRef} className="mb-4" />
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm"
          >
            <Download size={15} />
            Download QR (PNG)
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Cetak &amp; tempel QR ini di kasir. Kalau nanti pindah domain, cukup buka halaman ini
            lagi buat generate QR yang baru.
          </p>
        </div>
      </div>
    </div>
  );
}