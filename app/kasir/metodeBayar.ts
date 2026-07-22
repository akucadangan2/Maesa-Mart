export type KategoriBayar = "tunai" | "kartu" | "transfer" | "ewallet";

export interface MetodeBayarOption {
  id: string;
  name: string;
  kategori: KategoriBayar;
}

export const METODE_BAYAR_OPTIONS: MetodeBayarOption[] = [
  { id: "cash", name: "Tunai", kategori: "tunai" },
  { id: "debit_card", name: "Kartu Debit", kategori: "kartu" },
  { id: "credit_card", name: "Kartu Kredit", kategori: "kartu" },
  { id: "debit_mandiri", name: "Debit Mandiri", kategori: "kartu" },
  { id: "debit_bri", name: "Debit BRI", kategori: "kartu" },
  { id: "debit_bsg", name: "Debit BSG", kategori: "kartu" },
  { id: "debit_bni", name: "Debit BNI", kategori: "kartu" },
  { id: "ovo", name: "OVO", kategori: "ewallet" },
  { id: "gopay", name: "Gopay", kategori: "ewallet" },
  { id: "dana", name: "Dana", kategori: "ewallet" },
  { id: "qris_mandiri", name: "Qris Mandiri", kategori: "transfer" },
  { id: "debit_bca", name: "Debit BCA", kategori: "kartu" },
  { id: "qris_bni", name: "Qris BNI", kategori: "transfer" },
  { id: "qris_bca", name: "Qris BCA", kategori: "transfer" },
  { id: "debit_maybank", name: "Debit Maybank", kategori: "kartu" },
  { id: "shopee_pay", name: "Shopee", kategori: "ewallet" },
  { id: "all_credit_card", name: "All Kartu Kredit", kategori: "kartu" },
  { id: "qris_bri", name: "Qris BRI", kategori: "transfer" },
];