import { redirect } from "next/navigation";

// Pelanggan masuk lewat scan QR statis di kasir ATAU klik link website,
// dua-duanya mengarah ke halaman yang sama: /order.
export default function Home() {
  redirect("/order");
}
