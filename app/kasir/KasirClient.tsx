"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Minus,
  Plus,
  Trash2,
  History,
  Package,
  Pause,
  Image as ImageIcon,
  WifiOff,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getOnlineOrdersRingkas,
  getOnlineOrderDetail,
  type KasirSearchResult,
  type KasirUnitOption,
} from "./actions";
import { METODE_BAYAR_OPTIONS } from "./metodeBayar";
import { useKasirHybrid, getLocalServerUrl, setLocalServerUrlPref } from "./hooks/useKasirHybrid";
import { cariMember, getActiveTiers, type MemberResult, type DiskonTierRingkas } from "./membershipActions";
import CheckoutModal from "./components/CheckoutModal";
import PendingListModal from "./components/PendingListModal";
import ReceiptModal from "./components/ReceiptModal";
import RiwayatModal from "./components/RiwayatModal";
import OnlineOrdersModal from "./components/OnlineOrdersModal";
import LocalServerSettingsModal from "./components/LocalServerSettingsModal";

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

function unitKeyOf(u: KasirUnitOption) {
  return u.product_unit_id ?? "base";
}

function selectedUnit(line: CartLine): KasirUnitOption {
  return line.units.find((u) => unitKeyOf(u) === line.selectedUnitKey) ?? line.units[0];
}

function formatRibuan(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function parseRibuan(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function buatNomorInvoiceDraft() {
  const now = new Date();
  const tgl = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getFullYear()).slice(2)}`;
  const acak = Math.floor(1000 + Math.random() * 9000);
  return `INV-${tgl}${acak}`;
}

export default function KasirClient({ staffId, staffNama }: { staffId: string; staffNama: string }) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { modeOffline, cariProdukHybrid, buatPenjualanHybrid, riwayatHybrid } = useKasirHybrid(staffId);

  const [draftInvoiceNo] = useState(() => buatNomorInvoiceDraft());
  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [jumlahScan, setJumlahScan] = useState("1");
  const [results, setResults] = useState<KasirSearchResult[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pendingList, setPendingList] = useState<PendingDraft[]>([]);
  const [pendingListOpen, setPendingListOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [kodePembeli, setKodePembeli] = useState("");
  const [namaPembeli, setNamaPembeli] = useState("");
  const [diskonManual, setDiskonManual] = useState("");
  const [metodeBayarId, setMetodeBayarId] = useState("cash");
  const [noReferensi, setNoReferensi] = useState("");
  const [uangDiterima, setUangDiterima] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<MemberResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [activeTiers, setActiveTiers] = useState<DiskonTierRingkas[]>([]);
  const memberSearchSeq = useRef(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  const [riwayatOpen, setRiwayatOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  const [onlineOpen, setOnlineOpen] = useState(false);
  const [onlinePendingCount, setOnlinePendingCount] = useState(0);
  const [onlineFilter, setOnlineFilter] = useState<"pending" | "semua">("pending");
  const [onlineOrders, setOnlineOrders] = useState<Awaited<ReturnType<typeof getOnlineOrdersRingkas>>>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [expandedOnlineId, setExpandedOnlineId] = useState<string | null>(null);
  const [onlineDetailCache, setOnlineDetailCache] = useState<Record<string, Awaited<ReturnType<typeof getOnlineOrderDetail>>>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const searchSeq = useRef(0);

  const metodeBayarOption =
    METODE_BAYAR_OPTIONS.find((o) => o.id === metodeBayarId) ?? METODE_BAYAR_OPTIONS[0];
  const isTunai = metodeBayarOption.id === "cash";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    getActiveTiers().then(setActiveTiers).catch(() => {});
  }, []);

  useEffect(() => {
    const seq = ++memberSearchSeq.current;
    const t = setTimeout(async () => {
      if (!memberQuery.trim() || selectedMember) {
        setMemberResults([]);
        return;
      }
      const data = await cariMember(memberQuery);
      if (seq === memberSearchSeq.current) setMemberResults(data);
    }, 300);
    return () => clearTimeout(t);
  }, [memberQuery, selectedMember]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Gagal daftarin service worker, gapapa — fitur install/offline-shell
        // cuma jadi gak aktif, fitur hybrid ke server lokal tetap jalan normal.
      });
    }
  }, []);

  useEffect(() => {
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const data = await cariProdukHybrid(query);
      if (seq !== searchSeq.current) return;
      if (data.length === 1) {
        tambahKeCart(data[0]);
      } else {
        setResults(data);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (modeOffline) return;

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
  }, [modeOffline]);

  useEffect(() => {
    if (!onlineOpen || modeOffline) return;
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
  }, [onlineOpen, onlineFilter, modeOffline]);

  function tambahKeCart(item: KasirSearchResult) {
    // Selalu default ke satuan eceran pas scan, biar konsisten. Kalau
    // pelanggan beli satuan besar, kasir ubah manual lewat dropdown satuan
    // di baris keranjangnya.
    const unit = item.units[0];
    const key = unitKeyOf(unit);
    const jumlah = Math.max(1, Number(jumlahScan) || 1);

    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === item.product_id && c.selectedUnitKey === key);
      if (existing) {
        return prev.map((c) =>
          c.product_id === item.product_id && c.selectedUnitKey === key
            ? { ...c, qty: c.qty + jumlah }
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
          qty: jumlah,
        },
      ];
    });
    setQuery("");
    setResults([]);
    setJumlahScan("1");
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
  const diskonNum = parseRibuan(diskonManual);

  const diskonMembership = (() => {
    if (!selectedMember) return 0;
    const eligible = activeTiers.filter(
      (t) => selectedMember.total_poin >= t.minimal_poin && subtotal >= t.minimal_belanja
    );
    if (eligible.length === 0) return 0;
    const best = eligible.reduce((a, b) => (b.diskon_persen > a.diskon_persen ? b : a));
    return Math.round(subtotal * (best.diskon_persen / 100));
  })();

  const totalSetelahDiskon = Math.max(0, subtotal - diskonNum - diskonMembership);
  const uangDiterimaNum = parseRibuan(uangDiterima);
  const kembalian = isTunai ? uangDiterimaNum - totalSetelahDiskon : null;

  function resetSemua() {
    setCart([]);
    setKodePembeli("");
    setNamaPembeli("");
    setDiskonManual("");
    setMetodeBayarId("cash");
    setNoReferensi("");
    setUangDiterima("");
    setMemberQuery("");
    setSelectedMember(null);
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

  function tutupCheckout() {
    setCheckoutOpen(false);
    setUangDiterima("");
    setDiskonManual("");
    setNoReferensi("");
    setMetodeBayarId("cash");
    setMemberQuery("");
    setSelectedMember(null);
  }

  async function handleSelesaikan() {
    setErrorMsg(null);

    if (cart.length === 0) {
      setErrorMsg("Keranjang masih kosong.");
      return;
    }
    if (isTunai && uangDiterimaNum < totalSetelahDiskon) {
      setErrorMsg("Uang diterima kurang dari total.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await buatPenjualanHybrid({
        kasir_id: staffId,
        customer_id: selectedMember?.id ?? null,
        metode_bayar: metodeBayarOption.kategori,
        detail_bayar: isTunai ? null : metodeBayarOption.name,
        no_referensi: isTunai ? null : noReferensi || null,
        uang_diterima: isTunai ? uangDiterimaNum : null,
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
    setRiwayat(await riwayatHybrid());
  }

  async function bukaOnline(filter: "pending" | "semua" = onlineFilter) {
    if (modeOffline) {
      alert("Pesanan Online butuh koneksi internet, lagi gak bisa diakses (mode offline).");
      return;
    }
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
    <main className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="shrink-0 bg-white border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">Kasir POS</div>
          {modeOffline && (
            <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
              <WifiOff size={12} />
              Mode Offline
            </span>
          )}
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
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5"
            title="Alamat Server Lokal"
          >
            <Settings size={13} />
          </button>
          <button onClick={handleLogout} className="text-xs text-red-500 border rounded-full px-3 py-1.5">
            Keluar
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden p-4 max-w-5xl mx-auto w-full">
        <div className="shrink-0 flex flex-col md:flex-row gap-3 mb-3">
          <div className="flex-1 bg-white border rounded-xl p-3 grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">No. Invoice</div>
              <div className="font-mono text-sm font-medium truncate">{draftInvoiceNo}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Tanggal</div>
              <div className="text-sm font-medium">{todayFormatted}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Kasir</div>
              <div className="inline-block bg-brand text-white text-xs font-medium px-2 py-1 rounded truncate max-w-full">
                {staffNama}
              </div>
            </div>
          </div>

          <div className="bg-brand rounded-xl p-3 flex flex-col justify-center md:w-64 shrink-0">
            <div className="text-xs text-white/80 mb-0.5">TOTAL HARGA</div>
            <div className="text-3xl font-bold font-mono text-white leading-tight">
              Rp{subtotal.toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex gap-2 mb-3 items-end">
          <div className="w-20 shrink-0">
            <label className="text-xs font-medium text-gray-600 block mb-1">Jumlah*</label>
            <input
              type="number"
              min={1}
              value={jumlahScan}
              onChange={(e) => setJumlahScan(e.target.value)}
              className="w-full rounded-xl border text-sm bg-white text-center px-2 py-3"
            />
          </div>
          <div className="relative flex-1">
            <label className="text-xs font-medium text-gray-600 block mb-1">Kode Barcode*</label>
            <Search size={16} className="absolute left-3 top-[calc(50%+10px)] -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Kode barcode / nama produk..."
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
        </div>

        <div className="flex-1 overflow-y-auto bg-white rounded-xl border mb-3">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-10">
              Keranjang kosong, scan atau cari produk di atas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-brand text-white sticky top-0">
                  <tr>
                    <th className="p-2.5 text-xs font-medium text-left w-8">No</th>
                    <th className="p-2.5 text-xs font-medium text-left w-12">Foto</th>
                    <th className="p-2.5 text-xs font-medium text-left">Nama Produk</th>
                    <th className="p-2.5 text-xs font-medium text-left w-24">Satuan</th>
                    <th className="p-2.5 text-xs font-medium text-right w-24">Harga</th>
                    <th className="p-2.5 text-xs font-medium text-center w-28">Jumlah</th>
                    <th className="p-2.5 text-xs font-medium text-right w-24">Total</th>
                    <th className="p-2.5 text-xs font-medium text-center w-12">Hapus</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line, i) => {
                    const unit = selectedUnit(line);
                    const stokDalamSatuanIni = Math.floor(line.stok_tersedia_eceran / unit.konversi);
                    const kurangStok = line.qty > stokDalamSatuanIni;

                    return (
                      <tr key={`${line.product_id}-${line.selectedUnitKey}`} className="border-t">
                        <td className="p-2.5 text-xs text-gray-500">{i + 1}</td>
                        <td className="p-2.5">
                          {line.foto_url ? (
                            <img
                              src={line.foto_url}
                              alt={line.nama_produk}
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                              <ImageIcon size={12} className="text-gray-300" />
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="font-medium">{line.nama_produk}</div>
                          {kurangStok && (
                            <div className="text-xs text-orange-600">
                              Stok cuma {stokDalamSatuanIni} {unit.satuan}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          {line.units.length > 1 ? (
                            <select
                              value={line.selectedUnitKey}
                              onChange={(e) => ubahSatuan(i, e.target.value)}
                              className="border rounded text-xs px-1.5 py-1 w-full"
                            >
                              {line.units.map((u) => (
                                <option key={unitKeyOf(u)} value={unitKeyOf(u)}>
                                  {u.satuan}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-500">{unit.satuan}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs">
                          {unit.harga_jual.toLocaleString("id-ID")}
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => ubahQty(i, line.qty - 1)}
                              className="w-6 h-6 flex items-center justify-center rounded border text-gray-500"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-6 text-center text-sm font-mono">{line.qty}</span>
                            <button
                              onClick={() => ubahQty(i, line.qty + 1)}
                              className="w-6 h-6 flex items-center justify-center rounded border text-gray-500"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs font-semibold">
                          {(unit.harga_jual * line.qty).toLocaleString("id-ID")}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => hapusItem(i)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="shrink-0 flex gap-2">
            <button
              onClick={handleTahan}
              className="flex-1 flex items-center justify-center gap-1.5 border rounded-xl py-2.5 text-sm font-medium text-gray-600 bg-white"
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
        )}
      </div>

      {settingsOpen && (
        <LocalServerSettingsModal
          initialUrl={getLocalServerUrl()}
          onClose={() => setSettingsOpen(false)}
          onSave={(url) => {
            setLocalServerUrlPref(url);
            setSettingsOpen(false);
          }}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          subtotal={subtotal}
          totalSetelahDiskon={totalSetelahDiskon}
          diskonManual={diskonManual}
          onDiskonChange={(v) => setDiskonManual(formatRibuan(v))}
          kodePembeli={kodePembeli}
          onKodePembeliChange={setKodePembeli}
          namaPembeli={namaPembeli}
          onNamaPembeliChange={setNamaPembeli}
          metodeBayarId={metodeBayarId}
          onMetodeBayarChange={setMetodeBayarId}
          isTunai={isTunai}
          uangDiterima={uangDiterima}
          onUangDiterimaChange={(v) => setUangDiterima(formatRibuan(v))}
          kembalian={kembalian}
          noReferensi={noReferensi}
          onNoReferensiChange={setNoReferensi}
          memberQuery={memberQuery}
          onMemberQueryChange={setMemberQuery}
          memberResults={memberResults}
          selectedMember={selectedMember}
          onSelectMember={setSelectedMember}
          diskonMembership={diskonMembership}
          errorMsg={errorMsg}
          submitting={submitting}
          onSubmit={handleSelesaikan}
          onClose={tutupCheckout}
        />
      )}

      {pendingListOpen && (
        <PendingListModal
          pendingList={pendingList}
          onClose={() => setPendingListOpen(false)}
          onLanjutkan={lanjutkanPending}
          onHapus={hapusPending}
        />
      )}

      {receipt && <ReceiptModal receipt={receipt} staffNama={staffNama} onClose={() => setReceipt(null)} />}

      {riwayatOpen && (
        <RiwayatModal riwayat={riwayat} staffNama={staffNama} onClose={() => setRiwayatOpen(false)} />
      )}

      {onlineOpen && (
        <OnlineOrdersModal
          onlineFilter={onlineFilter}
          onFilterChange={(f) => bukaOnline(f)}
          onlinePendingCount={onlinePendingCount}
          onlineOrders={onlineOrders}
          onlineLoading={onlineLoading}
          expandedOnlineId={expandedOnlineId}
          onlineDetailCache={onlineDetailCache}
          loadingDetailId={loadingDetailId}
          onToggleExpand={toggleExpandOnline}
          onClose={() => setOnlineOpen(false)}
        />
      )}
    </main>
  );
}
