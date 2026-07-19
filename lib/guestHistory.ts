// lib/guestHistory.ts
// Nyimpen no HP tamu di localStorage device ini, biar pas balik ke /riwayat
// semua pesanan dari nomor itu otomatis muncul tanpa perlu ngetik ulang.

const KEY = "maesa_guest_no_hp";

export function simpanNoHpTamu(noHp: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, noHp);
}

export function ambilNoHpTamu(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}