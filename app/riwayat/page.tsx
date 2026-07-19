"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, PackageSearch, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ambilNoHpTamu, simpanNoHpTamu } from "@/lib/guestHistory";
import { downloadStruk } from "@/lib/strukGenerator";

interface RiwayatPesanan {
  id: string;
  nomor_order: string;
  status_pesanan: string;
  status_pembayaran: string;
  metode_bayar: string;
  catatan: string | null;
  total_jual: number;
  created_at: string;
  items: { nama: string; qty: number; subtotal: number }[];
}

const labelPesanan: Record<string, string> = {
  menunggu_validasi: "Menunggu Validasi",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const labelPembayaran: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  menunggu_konfirmasi: "Menunggu Konfirmasi",
  lunas: "Lunas",
};

const badgePesanan: Record<string, string> = {
  menunggu_validasi: "bg-blue-100 text-blue-700",
  diproses: "bg-yellow-100 text-yellow-700",
  selesai: "bg-green-100 text-green-700",
  dibatalkan: "bg-red-100 text-red-700",
};

export default function RiwayatPage() {
  const supabase = createClient();
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orders, setOrders] = useState<RiwayatPesanan[]>([]);
  const [manualNoHp, setManualNoHp] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [belumPernahCari, setBelumPernahCari] = useState(true);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: customerRow } = await supabase
          .from("customers")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (customerRow) {
          router.replace("/akun");
          return;
        }
      }

      setCheckingAuth(false);

      const savedNoHp = ambilNoHpTamu();
      if (savedNoHp) {
        await cariPesanan(savedNoHp);
      }
    }
    init();
  }, []);

  async function cariPesanan(noHp: string) {
    setSearching(true);
    setErrorMsg(null);
    setBelumPernahCari(false);

    const { data, error } = await supabase.rpc("get_pesanan_by_no_hp", {
      p_no_hp: noHp,
    });

    setSearching(false);

    if (error) {
      setErrorMsg("Gagal memuat pesanan. Coba lagi.");
      return;
    }

    const hasil = (data as RiwayatPesanan[]) ?? [];
    setOrders(hasil);

    if (hasil.length === 0) {
      setErrorMsg("Gak ada pesanan yang ketemu dari nomor HP ini.");
    } else {
      simpanNoHpTamu(noHp);
    }
  }

  async function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!manualNoHp.trim()) {
      setErrorMsg("Isi no HP dulu.");
      return;
    }
    await cariPesanan(manualNoHp.trim());
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft text-sm">
        Memuat...
      </div>
    );
  }

  return (
    <main className="min-h-screen max-w-lg mx-auto px-4 pb-16">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-line flex items-center gap-3 py-4">
        <a href="/order" className="w-9 h-9 flex items-center justify-center rounded-full border border-line">
          <ArrowLeft size={16} />
        </a>
        <h1 className="font-display text-xl font-semibold">Riwayat Pesanan</h1>
      </header>

      <form
        onSubmit={handleManualSearch}
        className="mt-4 mb-6 bg-surface border border-line rounded-2xl p-4 space-y-3"
      >
        <p className="text-sm font-medium">Cek pesanan pakai No HP</p>
        <p className="text-xs text-ink-soft">
          Masukkan no HP yang dipakai waktu pesan, semua riwayatnya bakal muncul.
        </p>
        <input
          value={manualNoHp}
          onChange={(e) => setManualNoHp(e.target.value)}
          placeholder="Contoh: 08221234xxxx"
          inputMode="numeric"
          className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
        <button
          type="submit"
          disabled={searching}
          className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
        >
          <Search size={15} />
          {searching ? "Mencari..." : "Cari Pesanan"}
        </button>
      </form>

      {orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-surface border border-line rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-medium">{o.nomor_order}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${badgePesanan[o.status_pesanan]}`}>
                  {labelPesanan[o.status_pesanan]}
                </span>
              </div>
              <div className="text-xs text-ink-soft mb-3">
                {new Date(o.created_at).toLocaleString("id-ID")} ·{" "}
                {labelPembayaran[o.status_pembayaran]}
              </div>
              <div className="space-y-1 mb-3">
                {o.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {it.nama} <span className="text-ink-soft">x{it.qty}</span>
                    </span>
                    <span className="font-mono">Rp{it.subtotal.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-line mb-3">
                <span>Total</span>
                <span className="font-mono">Rp{o.total_jual.toLocaleString("id-ID")}</span>
              </div>
              <button
                onClick={() => downloadStruk(o)}
                className="w-full flex items-center justify-center gap-2 border border-line rounded-xl py-2 text-xs font-medium text-ink-soft hover:bg-bg"
              >
                <Download size={14} />
                Download Struk
              </button>
            </div>
          ))}
        </div>
      )}

      {belumPernahCari && (
        <div className="text-center py-10">
          <PackageSearch className="mx-auto mb-2 text-ink-soft" size={32} />
          <p className="text-sm text-ink-soft">Masukkan no HP buat lihat riwayat pesananmu.</p>
        </div>
      )}
    </main>
  );
}