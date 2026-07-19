"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Minus,
  Plus,
  Trash2,
  Printer,
  History,
  Package,
  Pause,
  ListChecks,
  X,
  Loader2,
  Phone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { downloadStruk } from "@/lib/strukGenerator";
import {
  searchKasirItems,
  createPosSale,
  getRiwayatKasirHariIni,
  getOnlineOrdersRingkas,
  getOnlineOrderDetail,
  type KasirSearchResult,
  type KasirUnitOption,
} from "./actions";

interface CartLine {
  product_id: string;
  nama_produk: string;
  foto_url: string | null;
  stok_tersedia_eceran: number;
  units: KasirUnitOption[];
  selectedUnitKey: string;
  qty: number;
}

interface PendingDraft {
  id: string;
  label: string;
  cart: CartLine[];
  kodePembeli: string;
  namaPembeli: string;
}

type MetodeBayar = "tunai" | "kartu" | "transfer" | "ewallet";

function unitKeyOf(u: KasirUnitOption) {
  return u.product_unit_id ?? "base";
}

function selectedUnit(line: CartLine): KasirUnitOption {
  return line.units.find((u) => unitKeyOf(u) === line.selectedUnitKey) ?? line.units[0];
}

export default function KasirClient({ staffId, staffNama }: { staffId: string; staffNama: string }) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KasirSearchResult[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pendingList, setPendingList] = useState<PendingDraft[]>([]);
  const [pendingListOpen, setPendingListOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [kodePembeli, setKodePembeli] = useState("");
  const [namaPembeli, setNamaPembeli] = useState("");
  const [diskonManual, setDiskonManual] = useState("");
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayar>("tunai");
  const [detailBayar, setDetailBayar] = useState("");
  const [noReferensi, setNoReferensi] = useState("");
  const [uangDiterima, setUangDiterima] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Awaited<ReturnType<typeof createPosSale>> | null>(null);

  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<Awaited<ReturnType<typeof getRiwayatKasirHariIni>>>([]);

  const [onlineOpen, setOnlineOpen] = useState(false);
  const [onlinePendingCount, setOnlinePendingCount] = useState(0);
  const [onlineFilter, setOnlineFilter] = useState<"pending" | "semua">("pending");
  const [onlineOrders, setOnlineOrders] = useState<Awaited<ReturnType<typeof getOnlineOrdersRingkas>>>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [expandedOnlineId, setExpandedOnlineId] = useState<string | null>(null);
  const [onlineDetailCache, setOnlineDetailCache] = useState<Record<string, Awaited<ReturnType<typeof getOnlineOrderDetail>>>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim()) {
        setResults(await searchKasirItems(query));
      } else {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Badge angka pesanan yang perlu validasi, update sendiri real-time
  useEffect(() => {
    async function loadPendingCount() {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("channel", "online")
        .eq("status_pesanan", "menunggu_validasi");
      setOnlinePendingCount(count ?? 0);
    }
    loadPendingCount();

    const channel = supabase
      .channel("kasir-online-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // List di dalam modal ikut refresh otomatis kalau lagi kebuka
  useEffect(() => {
    if (!onlineOpen) return;
    const channel = supabase
      .channel("kasir-online-orders-modal")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        getOnlineOrdersRingkas(onlineFilter).then(setOnlineOrders);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineOpen, onlineFilter]);

  function tambahKeCart(item: KasirSearchResult) {
    const unit = item.units.find((u) => unitKeyOf(u) === item.matchedUnitKey) ?? item.units[0];
    const key = unitKeyOf(unit);

    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === item.product_id && c.selectedUnitKey === key);
      if (existing) {
        return prev.map((c) =>
          c.product_id === item.product_id && c.selectedUnitKey === key
            ? { ...c, qty: c.qty + 1 }
            : c
        );
      }
      return [
        ...prev,
        {
          product_id: item.product_id,
          nama_produk: item.nama_produk,
          foto_url: item.foto_url,
          stok_tersedia_eceran: item.stok_tersedia_eceran,
          units: item.units,
          selectedUnitKey: key,
          qty: 1,
        },
      ];
    });
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && results.length === 1) {
      e.preventDefault();
      tambahKeCart(results[0]);
    }
  }

  function ubahQty(index: number, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setCart((prev) => prev.map((c, i) => (i === index ? { ...c, qty } : c)));
  }

  function ubahSatuan(index: number, newUnitKey: string) {
    setCart((prev) => prev.map((c, i) => (i === index ? { ...c, selectedUnitKey: newUnitKey } : c)));
  }

  function hapusItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = cart.reduce((sum, line) => sum + selectedUnit(line).harga_jual * line.qty, 0);
  const diskonNum = Number(diskonManual) || 0;
  const totalSetelahDiskon = Math.max(0, subtotal - diskonNum);
  const uangDiterimaNum = Number(uangDiterima) || 0;
  const kembalian = metodeBayar === "tunai" ? uangDiterimaNum - totalSetelahDiskon : null;

  function resetSemua() {
    setCart([]);
    setKodePembeli("");
    setNamaPembeli("");
    setDiskonManual("");
    setMetodeBayar("tunai");
    setDetailBayar("");
    setNoReferensi("");
    setUangDiterima("");
  }

  function handleTahan() {
    if (cart.length === 0) return;
    const label = `${cart[0].nama_produk}${cart.length > 1 ? ` +${cart.length - 1} lainnya` : ""}`;
    setPendingList((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label, cart, kodePembeli, namaPembeli },
    ]);
    resetSemua();
  }

  function lanjutkanPending(draft: PendingDraft) {
    setCart(draft.cart);
    setKodePembeli(draft.kodePembeli);
    setNamaPembeli(draft.namaPembeli);
    setPendingList((prev) => prev.filter((d) => d.id !== draft.id));
    setPendingListOpen(false);
  }

  function hapusPending(id: string) {
    setPendingList((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSelesaikan() {
    setErrorMsg(null);

    if (cart.length === 0) {
      setErrorMsg("Keranjang masih kosong.");
      return;
    }
    if (metodeBayar === "tunai" && uangDiterimaNum < totalSetelahDiskon) {
      setErrorMsg("Uang diterima kurang dari total.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createPosSale({
        kasir_id: staffId,
        metode_bayar: metodeBayar,
        detail_bayar: metodeBayar === "tunai" ? null : detailBayar || null,
        no_referensi: metodeBayar === "tunai" ? null : noReferensi || null,
        uang_diterima: metodeBayar === "tunai" ? uangDiterimaNum : null,
        diskon_manual: diskonNum,
        nama_pembeli_pos: namaPembeli || null,
        kode_pembeli_pos: kodePembeli || null,
        items: cart.map((line) => {
          const unit = selectedUnit(line);
          return {
            product_id: line.product_id,
            product_unit_id: unit.product_unit_id,
            nama_produk: line.nama_produk,
            satuan: unit.satuan,
            konversi: unit.konversi,
            harga_jual: unit.harga_jual,
            harga_modal_per_eceran: unit.harga_modal_per_eceran,
            qty: line.qty,
          };
        }),
      });

      setReceipt(result);
      resetSemua();
      setCheckoutOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  async function bukaRiwayat() {
    setRiwayatOpen(true);
    setRiwayat(await getRiwayatKasirHariIni(staffId));
  }

  async function bukaOnline(filter: "pending" | "semua" = onlineFilter) {
    setOnlineOpen(true);
    setOnlineFilter(filter);
    setOnlineLoading(true);
    setExpandedOnlineId(null);
    try {
      setOnlineOrders(await getOnlineOrdersRingkas(filter));
    } finally {
      setOnlineLoading(false);
    }
  }

  async function toggleExpandOnline(id: string) {
    if (expandedOnlineId === id) {
      setExpandedOnlineId(null);
      return;
    }
    setExpandedOnlineId(id);
    if (!onlineDetailCache[id]) {
      setLoadingDetailId(id);
      try {
        const detail = await getOnlineOrderDetail(id);
        setOnlineDetailCache((prev) => ({ ...prev, [id]: detail }));
      } finally {
        setLoadingDetailId(null);
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/kasir/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold text-sm">Kasir POS</div>
          <div className="text-xs text-gray-500">{staffNama}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => bukaOnline()}
            className="relative flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5"
          >
            <Package size={13} />
            <span className="hidden sm:inline">Pesanan Online</span>
            {onlinePendingCount > 0 && (
              <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-semibold">
                {onlinePendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setPendingListOpen(true)}
            className="relative flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5"
          >
            <Pause size={13} />
            <span className="hidden sm:inline">Daftar Tahan</span>
            {pendingList.length > 0 && (
              <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-semibold">
                {pendingList.length}
              </span>
            )}
          </button>
          <button
            onClick={bukaRiwayat}
            className="flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5"
          >
            <History size={13} />
            <span className="hidden sm:inline">Riwayat</span>
          </button>
          <button onClick={handleLogout} className="text-xs text-red-500 border rounded-full px-3 py-1.5">
            Keluar
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Scan barcode atau ketik nama produk..."
            className="w-full pl-9 pr-3 py-3 rounded-xl border text-sm bg-white"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {results.map((r) => {
                const unit = r.units.find((u) => unitKeyOf(u) === r.matchedUnitKey) ?? r.units[0];
                return (
                  <button
                    key={r.product_id}
                    onClick={() => tambahKeCart(r)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 border-b last:border-0"
                  >
                    <div>
                      <div className="font-medium">{r.nama_produk}</div>
                      <div className="text-xs text-gray-500">
                        {unit.satuan} · Rp{unit.harga_jual.toLocaleString("id-ID")} · stok{" "}
                        {r.stok_tersedia_eceran}
                      </div>
                    </div>
                    <span className="text-xs text-brand">+ Tambah</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border overflow-hidden mb-4">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">
              Keranjang kosong, scan atau cari produk di atas.
            </p>
          ) : (
            <div className="divide-y">
              {cart.map((line, i) => {
                const unit = selectedUnit(line);
                const stokDalamSatuanIni = Math.floor(line.stok_tersedia_eceran / unit.konversi);
                const kurangStok = line.qty > stokDalamSatuanIni;

                return (
                  <div key={`${line.product_id}-${line.selectedUnitKey}`} className="flex items-center gap-2 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{line.nama_produk}</div>
                      <div className="text-xs text-gray-500">Rp{unit.harga_jual.toLocaleString("id-ID")}</div>
                      {kurangStok && (
                        <div className="text-xs text-orange-600 mt-0.5">
                          Stok cuma {stokDalamSatuanIni} {unit.satuan}, tetap bisa lanjut
                        </div>
                      )}
                    </div>

                    {line.units.length > 1 && (
                      <select
                        value={line.selectedUnitKey}
                        onChange={(e) => ubahSatuan(i, e.target.value)}
                        className="border rounded-lg text-xs px-1.5 py-1.5"
                      >
                        {line.units.map((u) => (
                          <option key={unitKeyOf(u)} value={unitKeyOf(u)}>
                            {u.satuan}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => ubahQty(i, line.qty - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full border"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-mono">{line.qty}</span>
                      <button
                        onClick={() => ubahQty(i, line.qty + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full border"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="w-20 text-right text-sm font-mono">
                      Rp{(unit.harga_jual * line.qty).toLocaleString("id-ID")}
                    </span>
                    <button onClick={() => hapusItem(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="font-mono">Rp{subtotal.toLocaleString("id-ID")}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTahan}
                className="flex-1 flex items-center justify-center gap-1.5 border rounded-xl py-2.5 text-sm font-medium text-gray-600"
              >
                <Pause size={14} />
                Tahan Transaksi
              </button>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="flex-1 bg-brand text-white rounded-xl py-2.5 text-sm font-semibold"
              >
                Selesaikan Transaksi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Selesaikan Transaksi */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Selesaikan Transaksi</h2>
              <button onClick={() => setCheckoutOpen(false)} className="text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="bg-brand text-white rounded-xl p-4 text-center mb-4">
              <div className="text-xs text-white/80 mb-1">Total Bayar</div>
              <div className="text-3xl font-bold font-mono">
                Rp{totalSetelahDiskon.toLocaleString("id-ID")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium block mb-1">Total Harga</label>
                <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono">
                  Rp{subtotal.toLocaleString("id-ID")}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Diskon (Rp)</label>
                <input
                  type="number"
                  value={diskonManual}
                  onChange={(e) => setDiskonManual(e.target.value)}
                  placeholder="0"
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Kode Pembeli (opsional)</label>
                <input
                  value={kodePembeli}
                  onChange={(e) => setKodePembeli(e.target.value)}
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Nama Pembeli (opsional)</label>
                <input
                  value={namaPembeli}
                  onChange={(e) => setNamaPembeli(e.target.value)}
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                />
              </div>
            </div>

            <label className="text-xs font-medium block mb-1">Metode Bayar</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(["tunai", "kartu", "transfer", "ewallet"] as MetodeBayar[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetodeBayar(m)}
                  className={`rounded-lg py-2 text-xs font-medium border capitalize ${
                    metodeBayar === m ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {metodeBayar === "tunai" ? (
              <div className="mb-3">
                <label className="text-xs font-medium block mb-1">Uang Diterima</label>
                <input
                  type="number"
                  value={uangDiterima}
                  onChange={(e) => setUangDiterima(e.target.value)}
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                />
                {kembalian !== null && kembalian >= 0 && (
                  <div className="text-sm text-brand mt-1">
                    Kembalian: Rp{kembalian.toLocaleString("id-ID")}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Nama Bank/Platform</label>
                  <input
                    value={detailBayar}
                    onChange={(e) => setDetailBayar(e.target.value)}
                    placeholder="Contoh: BCA, OVO"
                    className="border rounded-lg w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">No Referensi (opsional)</label>
                  <input
                    value={noReferensi}
                    onChange={(e) => setNoReferensi(e.target.value)}
                    className="border rounded-lg w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {errorMsg && <p className="text-red-500 text-xs mb-3">{errorMsg}</p>}

            <button
              onClick={handleSelesaikan}
              disabled={submitting}
              className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Selesaikan"}
            </button>
          </div>
        </div>
      )}

      {/* Modal Daftar Tahan */}
      {pendingListOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Daftar Transaksi Ditahan</h2>
              <button onClick={() => setPendingListOpen(false)} className="text-gray-400">
                <X size={18} />
              </button>
            </div>
            {pendingList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 flex flex-col items-center gap-2">
                <ListChecks size={24} className="text-gray-300" />
                Belum ada transaksi yang ditahan.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingList.map((d) => {
                  const total = d.cart.reduce(
                    (sum, line) => sum + selectedUnit(line).harga_jual * line.qty,
                    0
                  );
                  return (
                    <div key={d.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{d.label}</div>
                        <div className="text-xs text-gray-500">
                          {d.cart.length} item · Rp{total.toLocaleString("id-ID")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => lanjutkanPending(d)}
                          className="text-xs bg-brand text-white rounded-lg px-3 py-1.5"
                        >
                          Lanjutkan
                        </button>
                        <button onClick={() => hapusPending(d.id)} className="text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="text-brand text-4xl mb-2">✓</div>
            <div className="font-semibold text-lg mb-1">Transaksi Selesai</div>
            <div className="text-sm text-gray-500 mb-1 font-mono">{receipt.nomor_order}</div>
            <div className="text-2xl font-bold mb-1">
              Rp{receipt.total_jual.toLocaleString("id-ID")}
            </div>
            {receipt.kembalian !== null && receipt.kembalian > 0 && (
              <div className="text-sm text-brand mb-4">
                Kembalian: Rp{receipt.kembalian.toLocaleString("id-ID")}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() =>
                  downloadStruk({
                    nomor_order: receipt.nomor_order,
                    created_at: receipt.created_at,
                    metode_bayar: receipt.metode_bayar,
                    status_pesanan: "selesai",
                    total_jual: receipt.total_jual,
                    items: receipt.items,
                  })
                }
                className="flex-1 border rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <Printer size={15} />
                Cetak Struk
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 bg-brand text-white rounded-xl py-2.5 text-sm font-medium"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {riwayatOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Riwayat Hari Ini</h2>
              <button onClick={() => setRiwayatOpen(false)} className="text-gray-400">
                <X size={18} />
              </button>
            </div>
            {riwayat.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Belum ada transaksi hari ini.</p>
            ) : (
              <div className="space-y-2">
                {riwayat.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs">{r.nomor_order}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleTimeString("id-ID")} · {r.metode_bayar}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">
                        Rp{r.total_jual.toLocaleString("id-ID")}
                      </span>
                      <button
                        onClick={() =>
                          downloadStruk({
                            nomor_order: r.nomor_order,
                            created_at: r.created_at,
                            metode_bayar: r.metode_bayar,
                            status_pesanan: "selesai",
                            total_jual: r.total_jual,
                            items: (r.order_items ?? []).map((it: any) => ({
                              nama: it.nama_produk_snapshot,
                              qty: it.qty,
                              subtotal: it.subtotal,
                            })),
                          })
                        }
                        className="text-brand"
                        aria-label="Cetak ulang struk"
                      >
                        <Printer size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {onlineOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 pb-3 shrink-0">
              <h2 className="font-semibold">Pesanan Online</h2>
              <button onClick={() => setOnlineOpen(false)} className="text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 px-5 pb-3 shrink-0">
              <button
                onClick={() => bukaOnline("pending")}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                  onlineFilter === "pending" ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600"
                }`}
              >
                Perlu Validasi {onlinePendingCount > 0 && `(${onlinePendingCount})`}
              </button>
              <button
                onClick={() => bukaOnline("semua")}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                  onlineFilter === "semua" ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600"
                }`}
              >
                Semua (30 Terbaru)
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-5 flex-1">
              {onlineLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-10">
                  <Loader2 size={16} className="animate-spin" />
                  Memuat...
                </div>
              ) : onlineOrders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">
                  {onlineFilter === "pending" ? "Gak ada pesanan yang perlu divalidasi." : "Belum ada pesanan online."}
                </p>
              ) : (
                <div className="space-y-2">
                  {onlineOrders.map((o: any) => {
                    const isExpanded = expandedOnlineId === o.id;
                    const detail = onlineDetailCache[o.id];
                    const isLoadingThis = loadingDetailId === o.id;

                    return (
                      <div key={o.id} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleExpandOnline(o.id)}
                          className="w-full flex items-center justify-between gap-2 p-3 text-left"
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-xs">{o.nomor_order}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {o.customers?.nama ?? o.guest_nama ?? "Tamu"} ·{" "}
                              {new Date(o.created_at).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-sm">
                              Rp{o.total_jual.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </button>

                        <div className="px-3 pb-2 flex gap-1.5">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              o.status_pembayaran === "lunas"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {o.status_pembayaran === "lunas" ? "Sudah Bayar" : "Belum/Menunggu Bayar"}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {o.status_pesanan.replace("_", " ")}
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-gray-50 p-3 space-y-2">
                            {isLoadingThis ? (
                              <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                                <Loader2 size={13} className="animate-spin" />
                                Memuat detail...
                              </div>
                            ) : detail ? (
                              <>
                                <div className="space-y-1">
                                  {detail.order_items.map((it: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span>
                                        {it.nama_produk_snapshot}{" "}
                                        <span className="text-gray-400">x{it.qty}</span>
                                      </span>
                                      <span className="font-mono">Rp{it.subtotal.toLocaleString("id-ID")}</span>
                                    </div>
                                  ))}
                                </div>
                                {detail.catatan && (
                                  <div className="text-xs text-gray-600 pt-1 border-t">
                                    <span className="text-gray-400">Catatan: </span>
                                    {detail.catatan}
                                  </div>
                                )}
                                {((detail.customers as any)?.no_hp || detail.guest_no_hp) && (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-600 pt-1 border-t">
                                    <Phone size={12} />
                                    {(detail.customers as any)?.no_hp ?? detail.guest_no_hp}
                                  </div>
                                )}
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}