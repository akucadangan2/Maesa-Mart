// TODO: tampilkan NEXT_PUBLIC_APP_URL + "/order" sebagai link yang bisa dicopy,
// dan generate QR code dari link tsb (pakai package "qrcode", sudah ada di
// package.json) supaya bisa didownload lalu dicetak dan ditempel di kasir.
// Dua kanal ini (QR & link) sama-sama mengarah ke halaman /order yang sama.
export default function AdminQrPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Link &amp; QR Toko</h1>
      <p className="text-sm text-gray-500">
        Link pemesanan dan QR code yang bisa dicetak akan tampil di sini.
      </p>
    </div>
  );
}
