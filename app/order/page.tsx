"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBasket,
  Plus,
  Minus,
  X,
  CheckCircle2,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Search,
  Receipt,
  User,
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { simpanNoHpTamu } from "@/lib/guestHistory";
import type { BankAccount, Category, Product, ProductUnit } from "@/lib/types";

interface CartItem {
  product: Product;
  qty: number;
  unitId: string | null;
}

interface UnitOption {
  id: string | null;
  satuan: string;
  hargaJual: number;
  hargaModalPerEceran: number;
  konversi: number;
  adaDiskonEceran: boolean;
}

function hargaEfektif(p: Product) {
  return p.diskon_persen > 0
    ? Math.round(p.harga_jual * (1 - p.diskon_persen / 100))
    : p.harga_jual;
}

function getUnitOptions(product: Product, unitsMap: Record<string, ProductUnit[]>): UnitOption[] {
  const base: UnitOption = {
    id: null,
    satuan: product.satuan,
    hargaJual: hargaEfektif(product),
    hargaModalPerEceran: product.harga_modal,
    konversi: 1,
    adaDiskonEceran: product.diskon_persen > 0,
  };
  const alts: UnitOption[] = (unitsMap[product.id] ?? []).map((u) => ({
    id: u.id,
    satuan: u.satuan,
    hargaJual: u.harga_jual as number,
    hargaModalPerEceran: u.harga_beli / u.konversi,
    konversi: u.konversi,
    adaDiskonEceran: false,
  }));
  return [base, ...alts];
}

type LokasiStatus = "idle" | "loading" | "got" | "error";

export default function OrderPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productUnitsMap, setProductUnitsMap] = useState<Record<string, ProductUnit[]>>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [catatan, setCatatan] = useState("");
  const [metodeBayar, setMetodeBayar] = useState<"tunai" | "transfer">("tunai");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [buktiFile, setBuktiFile] = useState<File | null>(null);

  const [metodeAmbil, setMetodeAmbil] = useState<"ambil_sendiri" | "diantar">("ambil_sendiri");
  const [lokasiLat, setLokasiLat] = useState<number | null>(null);
  const [lokasiLng, setLokasiLng] = useState<number | null>(null);
  const [lokasiStatus, setLokasiStatus] = useState<LokasiStatus>("idle");
  const [lokasiErrorMsg, setLokasiErrorMsg] = useState<string | null>(null);
  const [alamatPengantaran, setAlamatPengantaran] = useState("");

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [guestNama, setGuestNama] = useState("");
  const [guestNoHp, setGuestNoHp] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const [{ data: cats }, { data: prods }, { data: units }, { data: banks }, { data: userData }] =
        await Promise.all([
          supabase.from("categories").select("*").order("urutan"),
          supabase.from("products").select("*").eq("is_aktif", true),
          supabase.from("product_units").select("*").not("harga_jual", "is", null),
          supabase.from("bank_accounts").select("*").eq("is_aktif", true),
          supabase.auth.getUser(),
        ]);

      setCategories(cats ?? []);
      setProducts(prods ?? []);

      const unitsMap: Record<string, ProductUnit[]> = {};
      for (const u of units ?? []) {
        if (!unitsMap[u.product_id]) unitsMap[u.product_id] = [];
        unitsMap[u.product_id].push(u);
      }
      setProductUnitsMap(unitsMap);

      setBankAccounts(banks ?? []);
      setActiveCategory(cats?.[0]?.id ?? null);

      if (userData?.user) {
        const { data: customerRow } = await supabase
          .from("customers")
          .select("id")
          .eq("id", userData.user.id)
          .maybeSingle();
        setCustomerId(customerRow ? userData.user.id : null);
      } else {
        setCustomerId(null);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  const isLoggedIn = !!customerId;

  function unitOptionForCartItem(item: CartItem): UnitOption {
    const options = getUnitOptions(item.product, productUnitsMap);
    return options.find((o) => o.id === item.unitId) ?? options[0];
  }

  function tambahKeKeranjang(product: Product, qty: number, unitId: string | null) {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.unitId === unitId
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.unitId === unitId
            ? { ...item, qty: item.qty + qty }
            : item
        );
      }
      return [...prev, { product, qty, unitId }];
    });
  }

  function ubahQty(productId: string, unitId: string | null, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.unitId === unitId)));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.unitId === unitId ? { ...item, qty } : item
      )
    );
  }

  function hapusItem(productId: string, unitId: string | null) {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.unitId === unitId)));
  }

  function pilihKategori(categoryId: string) {
    setActiveCategory(categoryId);
    setSearchQuery("");
  }

  async function ambilLokasiSaya() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLokasiStatus("error");
      setLokasiErrorMsg("Browser ini gak mendukung ambil lokasi otomatis, isi alamat manual aja di bawah.");
      return;
    }
    setLokasiStatus("loading");
    setLokasiErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLokasiLat(lat);
        setLokasiLng(lng);
        setLokasiStatus("got");
        
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { Accept: "application/json" } }
          );
          const data = await res.json();
          if (data?.display_name) {
            setAlamatPengantaran(data.display_name);
          }
        } catch {
          // Gagal nerjemahin alamat, biarkan user isi manual
        }
      },
      (err) => {
        setLokasiStatus("error");
        let pesanDetail = err.message;
        
        // Pesan error lebih ramah dan spesifik untuk iOS/Browser yang nge-block
        if (err.code === err.PERMISSION_DENIED) {
          pesanDetail = "Izin ditolak. Aktifkan akses lokasi untuk browser ini di Pengaturan HP kamu.";
        } else if (err.code === err.TIMEOUT) {
          pesanDetail = "Waktu habis (sinyal GPS lemah). Isi alamat manual saja di bawah.";
        }
        
        setLokasiErrorMsg("Gagal: " + pesanDetail);
      },
      // Penyesuaian agar lebih support iOS:
      // - enableHighAccuracy: false (mengurangi kemungkinan timeout)
      // - timeout: diperbesar jadi 15 detik
      // - maximumAge: 0 (selalu minta data fresh)
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  }

  const totalJual = cart.reduce((sum, item) => sum + unitOptionForCartItem(item).hargaJual * item.qty, 0);
  const totalModal = cart.reduce((sum, item) => {
    const unit = unitOptionForCartItem(item);
    return sum + unit.hargaModalPerEceran * unit.konversi * item.qty;
  }, 0);
  const totalItemDiKeranjang = cart.reduce((sum, item) => sum + item.qty, 0);

  async function uploadBuktiTransfer(): Promise<string | null> {
    if (!buktiFile) return null;

    const ext = buktiFile.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("bukti-transfer").upload(fileName, buktiFile);
    if (error) throw new Error("Upload bukti transfer gagal: " + error.message);

    const { data } = supabase.storage.from("bukti-transfer").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleCheckout() {
    setErrorMsg(null);

    if (cart.length === 0) {
      setErrorMsg("Keranjang masih kosong.");
      return;
    }
    if (!isLoggedIn && (!guestNama.trim() || !guestNoHp.trim())) {
      setErrorMsg("Isi nama dan nomor HP dulu, biar bisa dihubungi soal pesanannya.");
      return;
    }
    if (metodeBayar === "transfer" && !selectedBankId) {
      setErrorMsg("Pilih bank tujuan transfer dulu.");
      return;
    }
    if (metodeBayar === "transfer" && !buktiFile) {
      setErrorMsg("Upload bukti transfer dulu.");
      return;
    }
    if (metodeAmbil === "diantar" && !alamatPengantaran.trim()) {
      setErrorMsg("Isi alamat lengkap dulu buat pengantaran.");
      return;
    }

    setSubmitting(true);

    try {
      const buktiUrl = metodeBayar === "transfer" ? await uploadBuktiTransfer() : null;

      const nomorOrder = `MSM-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      const orderId = crypto.randomUUID();

      const { error: orderError } = await supabase.from("orders").insert({
        id: orderId,
        nomor_order: nomorOrder,
        customer_id: customerId,
        guest_nama: customerId ? null : guestNama,
        guest_no_hp: customerId ? null : guestNoHp,
        metode_bayar: metodeBayar,
        bank_account_id: metodeBayar === "transfer" ? selectedBankId : null,
        bukti_bayar_url: buktiUrl,
        status_pembayaran: metodeBayar === "tunai" ? "belum_bayar" : "menunggu_konfirmasi",
        catatan: catatan || null,
        total_modal: totalModal,
        total_jual: totalJual,
        metode_ambil: metodeAmbil,
        lokasi_lat: metodeAmbil === "diantar" ? lokasiLat : null,
        lokasi_lng: metodeAmbil === "diantar" ? lokasiLng : null,
        alamat_pengantaran: metodeAmbil === "diantar" ? alamatPengantaran.trim() : null,
      });

      if (orderError) {
        throw new Error("Gagal membuat pesanan: " + orderError.message);
      }

      const orderItemsPayload = cart.map((item) => {
        const unit = unitOptionForCartItem(item);
        return {
          order_id: orderId,
          product_id: item.product.id,
          product_unit_id: item.unitId,
          nama_produk_snapshot: item.product.nama,
          qty: item.qty,
          harga_modal_saat_itu: unit.hargaModalPerEceran,
          harga_jual_saat_itu: unit.hargaJual,
          subtotal: unit.hargaJual * item.qty,
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
      if (itemsError) throw new Error("Gagal menyimpan detail pesanan: " + itemsError.message);

      setSuccessOrder(nomorOrder);
      if (!customerId) {
        simpanNoHpTamu(guestNoHp);
      }

      setCart([]);
      setCatatan("");
      setGuestNama("");
      setGuestNoHp("");
      setSelectedBankId("");
      setBuktiFile(null);
      setMetodeAmbil("ambil_sendiri");
      setLokasiLat(null);
      setLokasiLng(null);
      setLokasiStatus("idle");
      setLokasiErrorMsg(null);
      setAlamatPengantaran("");
      setCartOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  const isSearching = searchQuery.trim().length > 0;

  const displayedProducts = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.trim().toLowerCase();
      return products.filter((p) => p.nama.toLowerCase().includes(q));
    }
    return activeCategory ? products.filter((p) => p.category_id === activeCategory) : products;
  }, [products, activeCategory, searchQuery, isSearching]);

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft text-sm">
        Memuat menu...
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="/order" className="flex items-center">
            <img src="/866x288.png" alt="Maesa Mart" className="h-9 w-auto" />
          </a>
          <div className="flex items-center gap-2">
            <a
              href={customerId ? "/akun" : "/login"}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={customerId ? "Akun saya" : "Login"}
            >
              <User size={18} className="text-ink" />
            </a>
            <a
              href="/riwayat"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Riwayat pesanan"
            >
              <Receipt size={18} className="text-ink" />
            </a>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Buka keranjang"
            >
              <ShoppingBasket size={18} className="text-ink" />
              {totalItemDiKeranjang > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-ink text-[10px] font-mono font-semibold">
                  {totalItemDiKeranjang}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-9 pr-9 py-2.5 rounded-full border border-line bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
                aria-label="Hapus pencarian"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {!isSearching && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => pilihKategori(c.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  activeCategory === c.id
                    ? "bg-brand text-white"
                    : "bg-surface text-ink-soft border border-line"
                }`}
              >
                {c.nama}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-5">
        {isSearching && (
          <p className="text-sm text-ink-soft mb-3">
            {displayedProducts.length} hasil untuk "{searchQuery}"
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              units={productUnitsMap[p.id] ?? []}
              onTambah={tambahKeKeranjang}
            />
          ))}
          {displayedProducts.length === 0 && (
            <p className="col-span-full text-center text-sm text-ink-soft py-10">
              {isSearching
                ? `Gak ada produk yang cocok dengan "${searchQuery}".`
                : "Belum ada produk di kategori ini."}
            </p>
          )}
        </div>
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 motion-reduce:transition-none ${
          totalItemDiKeranjang > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className="max-w-5xl mx-auto"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between bg-brand text-white rounded-t-2xl mx-auto px-5 py-3.5 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className="text-sm">
              {totalItemDiKeranjang} item ·{" "}
              <span className="font-mono font-semibold">
                Rp{totalJual.toLocaleString("id-ID")}
              </span>
            </span>
            <span className="text-sm font-medium">Lihat Keranjang →</span>
          </button>
        </div>
      </div>

      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-surface rounded-3xl p-6 max-w-sm w-full text-center">
            <CheckCircle2 className="mx-auto mb-3 text-brand" size={40} />
            <div className="font-display text-lg font-semibold mb-1">Pesanan berhasil dibuat</div>
            <div className="text-sm text-ink-soft mb-5">
              Nomor pesanan{" "}
              <span className="font-mono text-ink font-medium">{successOrder}</span>
            </div>

            <div className="flex gap-3">
              <a
                href="/riwayat"
                className="flex-1 border border-line rounded-xl py-2.5 text-sm font-medium text-center hover:bg-bg"
              >
                Lihat Riwayat
              </a>
              <button
                onClick={() => setSuccessOrder(null)}
                className="flex-1 bg-brand text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand/90"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 z-40 ${cartOpen ? "" : "pointer-events-none"}`}>
        <div
          onClick={() => setCartOpen(false)}
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 motion-reduce:transition-none ${
            cartOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-2xl max-h-[88vh] overflow-y-auto transition-transform duration-300 ease-out motion-reduce:transition-none ${
            cartOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="sticky top-0 bg-surface flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <div className="mx-auto w-10 h-1 rounded-full bg-line absolute left-1/2 -translate-x-1/2 top-2" />
            <h2 className="font-display font-semibold text-lg">Keranjang Pesanan</h2>
            <button
              onClick={() => setCartOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg"
              aria-label="Tutup keranjang"
            >
              <X size={18} className="text-ink-soft" />
            </button>
          </div>

          <div className="px-5 py-4">
            {cart.length === 0 ? (
              <p className="text-sm text-ink-soft py-6 text-center">Keranjang masih kosong.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {cart.map((item) => {
                  const unit = unitOptionForCartItem(item);
                  return (
                    <div key={`${item.product.id}-${item.unitId ?? "base"}`} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.product.nama}</div>
                        <div className="text-xs text-ink-soft">{unit.satuan}</div>
                        <div className="text-xs font-mono text-ink-soft">
                          Rp{(unit.hargaJual * item.qty).toLocaleString("id-ID")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => ubahQty(item.product.id, item.unitId, item.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-full border border-line"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-sm font-mono">{item.qty}</span>
                        <button
                          onClick={() => ubahQty(item.product.id, item.unitId, item.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-full border border-line"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        onClick={() => hapusItem(item.product.id, item.unitId)}
                        className="w-7 h-7 flex items-center justify-center text-ink-soft hover:text-red-500"
                        aria-label="Hapus item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {cart.length > 0 && (
              <>
                <div className="mb-4">
                  <label className="text-sm font-medium block mb-1.5">Catatan</label>
                  <input
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: dibungkus terpisah"
                    className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium block mb-1.5">Cara Ambil Pesanan</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setMetodeAmbil("ambil_sendiri")}
                      className={`rounded-xl py-2.5 text-sm font-medium border ${
                        metodeAmbil === "ambil_sendiri"
                          ? "bg-brand text-white border-brand"
                          : "border-line text-ink-soft"
                      }`}
                    >
                      Ambil di Toko
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodeAmbil("diantar")}
                      className={`rounded-xl py-2.5 text-sm font-medium border ${
                        metodeAmbil === "diantar"
                          ? "bg-brand text-white border-brand"
                          : "border-line text-ink-soft"
                      }`}
                    >
                      Minta Diantar
                    </button>
                  </div>

                  {metodeAmbil === "diantar" && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={ambilLokasiSaya}
                        className="w-full flex items-center justify-center gap-2 border border-line rounded-xl py-2.5 text-sm text-ink"
                      >
                        <MapPin size={15} />
                        {lokasiStatus === "loading"
                          ? "Mengambil lokasi..."
                          : lokasiStatus === "got"
                          ? "Lokasi didapat, ambil ulang?"
                          : "Ambil Lokasi Saya"}
                      </button>

                      {lokasiStatus === "got" && lokasiLat !== null && lokasiLng !== null && (
                        <a
                          href={`https://www.google.com/maps?q=${lokasiLat},${lokasiLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand underline block text-center"
                        >
                          Lihat titik lokasi di Google Maps
                        </a>
                      )}

                      {lokasiErrorMsg && (
                        <p className="text-xs text-orange-600">{lokasiErrorMsg}</p>
                      )}

                      <input
                        value={alamatPengantaran}
                        onChange={(e) => setAlamatPengantaran(e.target.value)}
                        placeholder="Alamat lengkap (nama jalan, no rumah, patokan)"
                        className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <p className="text-xs text-ink-soft">
                        Alamat di atas otomatis dari lokasi kamu, boleh diedit/dilengkapi kalau
                        kurang pas (misal nama gang atau patokan tambahan).
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium block mb-1.5">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodeBayar("tunai")}
                      className={`rounded-xl py-2.5 text-sm font-medium border ${
                        metodeBayar === "tunai"
                          ? "bg-brand text-white border-brand"
                          : "border-line text-ink-soft"
                      }`}
                    >
                      Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodeBayar("transfer")}
                      className={`rounded-xl py-2.5 text-sm font-medium border ${
                        metodeBayar === "transfer"
                          ? "bg-brand text-white border-brand"
                          : "border-line text-ink-soft"
                      }`}
                    >
                      Transfer
                    </button>
                  </div>

                  {metodeBayar === "transfer" && (
                    <div className="mt-3 space-y-3">
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="">Pilih bank tujuan</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nama_bank} - {b.no_rekening}
                          </option>
                        ))}
                      </select>

                      {selectedBank && (
                        <div className="bg-bg border border-line rounded-xl p-3 text-sm">
                          <div className="font-medium">{selectedBank.nama_bank}</div>
                          <div className="font-mono">{selectedBank.no_rekening}</div>
                          <div className="text-ink-soft text-xs">a.n {selectedBank.atas_nama}</div>
                        </div>
                      )}

                      <label className="flex items-center gap-2 border border-dashed border-line rounded-xl px-3 py-3 text-sm text-ink-soft cursor-pointer">
                        <UploadCloud size={16} />
                        {buktiFile ? buktiFile.name : "Upload bukti transfer"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setBuktiFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {!isLoggedIn && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-ink-soft">
                      Belum login. Isi nama & no HP supaya toko bisa menghubungi soal pesananmu,
                      atau <a href="/login" className="text-brand underline">login di sini</a>.
                    </p>
                    <input
                      value={guestNama}
                      onChange={(e) => setGuestNama(e.target.value)}
                      placeholder="Nama"
                      className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <input
                      value={guestNoHp}
                      onChange={(e) => setGuestNoHp(e.target.value)}
                      placeholder="No HP"
                      className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-4 pt-2 border-t border-line">
                  <span className="text-sm text-ink-soft pt-3">Total Harga</span>
                  <span className="font-mono font-semibold text-lg pt-3">
                    Rp{totalJual.toLocaleString("id-ID")}
                  </span>
                </div>

                {errorMsg && <p className="text-red-500 text-xs mb-3">{errorMsg}</p>}

                <button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="w-full bg-brand text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50 mb-4"
                >
                  {submitting ? "Memproses..." : "Checkout Sekarang"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ProductCard({
  product,
  units,
  onTambah,
}: {
  product: Product;
  units: ProductUnit[];
  onTambah: (product: Product, qty: number, unitId: string | null) => void;
}) {
  const [qty, setQty] = useState(1);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const options = getUnitOptions(product, { [product.id]: units });
  const selected = options.find((o) => o.id === selectedUnitId) ?? options[0];
  const adaDiskonBadge = product.diskon_persen > 0;

  return (
    <div className="rounded-2xl bg-surface border border-line overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-line/30">
        {product.foto_url ? (
          <img src={product.foto_url} alt={product.nama} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={28} className="text-ink-soft/50" />
          </div>
        )}
        {adaDiskonBadge && (
          <div className="absolute top-2 -right-9 w-32 rotate-45 bg-accent py-1 text-center shadow-sm">
            <span className="font-mono text-[10px] font-semibold text-accent-ink">
              -{product.diskon_persen}%
            </span>
          </div>
        )}
      </div>

      <div className="px-3 pt-3 pb-3 flex flex-col flex-1">
        <div className="text-sm font-medium text-ink leading-snug line-clamp-2 mb-1">
          {product.nama}
        </div>

        {options.length > 1 ? (
          <select
            value={selectedUnitId ?? "base"}
            onChange={(e) => setSelectedUnitId(e.target.value === "base" ? null : e.target.value)}
            className="text-xs border border-line rounded-lg px-2 py-1 mb-2 bg-bg"
          >
            {options.map((o) => (
              <option key={o.id ?? "base"} value={o.id ?? "base"}>
                {o.satuan}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs text-ink-soft mb-2">{product.satuan}</div>
        )}

        {selected.id === null && selected.adaDiskonEceran ? (
          <div className="mb-3 flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-xs text-ink-soft line-through">
              Rp{product.harga_jual.toLocaleString("id-ID")}
            </span>
            <span className="font-mono text-sm font-semibold text-brand">
              Rp{selected.hargaJual.toLocaleString("id-ID")}
            </span>
          </div>
        ) : (
          <div className="font-mono text-sm font-semibold text-brand mb-3">
            Rp{selected.hargaJual.toLocaleString("id-ID")}
          </div>
        )}

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-line"
            >
              <Minus size={13} />
            </button>
            <span className="w-5 text-center text-sm font-mono">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-line"
            >
              <Plus size={13} />
            </button>
          </div>
          <button
            onClick={() => onTambah(product, qty, selectedUnitId)}
            className="w-full flex items-center justify-center gap-1.5 bg-brand text-white rounded-lg py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ShoppingBasket size={13} />
            Tambah
          </button>
        </div>
      </div>
    </div>
  );
}