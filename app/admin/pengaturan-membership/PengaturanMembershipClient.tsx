"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, Power } from "lucide-react";
import {
  updatePoinProduk,
  createDiskonTier,
  toggleDiskonTier,
  deleteDiskonTier,
} from "./actions";

interface UnitRow {
  product_unit_id: string | null;
  satuan: string;
  poin: number;
  config_id: string | null;
}

interface ProdukRow {
  id: string;
  nama: string;
  units: UnitRow[];
}

interface TierRow {
  id: string;
  nama_tier: string | null;
  minimal_poin: number;
  diskon_persen: number;
  minimal_belanja: number;
  is_aktif: boolean;
}

export default function PengaturanMembershipClient({
  initialProduk,
  initialTiers,
}: {
  initialProduk: ProdukRow[];
  initialTiers: TierRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [produk, setProduk] = useState(initialProduk);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [tiers, setTiers] = useState(initialTiers);
  const [tierFormOpen, setTierFormOpen] = useState(false);
  const [namaTier, setNamaTier] = useState("");
  const [minimalPoin, setMinimalPoin] = useState("");
  const [diskonPersen, setDiskonPersen] = useState("");
  const [minimalBelanja, setMinimalBelanja] = useState("");
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  const filteredProduk = produk.filter((p) =>
    p.nama.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function handlePoinChange(
    productId: string,
    unitKey: string,
    productUnitId: string | null,
    value: string
  ) {
    const poin = Math.max(0, Number(value) || 0);
    setProduk((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              units: p.units.map((u) =>
                (u.product_unit_id ?? "base") === unitKey ? { ...u, poin } : u
              ),
            }
          : p
      )
    );

    setSavingKey(`${productId}-${unitKey}`);
    try {
      await updatePoinProduk(productId, productUnitId, poin);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan poin");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleTambahTier() {
    setTierError(null);
    if (!minimalPoin || !diskonPersen) {
      setTierError("Minimal poin dan diskon wajib diisi.");
      return;
    }
    setTierSaving(true);
    try {
      await createDiskonTier({
        nama_tier: namaTier || `Tier ${minimalPoin} Poin`,
        minimal_poin: Number(minimalPoin),
        diskon_persen: Number(diskonPersen),
        minimal_belanja: Number(minimalBelanja) || 0,
      });
      setTierFormOpen(false);
      setNamaTier("");
      setMinimalPoin("");
      setDiskonPersen("");
      setMinimalBelanja("");
      router.refresh();
      setTiers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          nama_tier: namaTier || `Tier ${minimalPoin} Poin`,
          minimal_poin: Number(minimalPoin),
          diskon_persen: Number(diskonPersen),
          minimal_belanja: Number(minimalBelanja) || 0,
          is_aktif: true,
        },
      ]);
    } catch (err) {
      setTierError(err instanceof Error ? err.message : "Gagal menyimpan tier");
    } finally {
      setTierSaving(false);
    }
  }

  async function handleToggleTier(tier: TierRow) {
    setTiers((prev) =>
      prev.map((t) => (t.id === tier.id ? { ...t, is_aktif: !t.is_aktif } : t))
    );
    await toggleDiskonTier(tier.id, !tier.is_aktif);
  }

  async function handleDeleteTier(id: string) {
    if (!confirm("Hapus tier diskon ini?")) return;
    setTiers((prev) => prev.filter((t) => t.id !== id));
    await deleteDiskonTier(id);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <a href="/admin/pelanggan" className="text-sm text-gray-400 hover:text-gray-600">
          ← Data Membership
        </a>
      </div>
      <h1 className="text-xl font-bold mb-4">Pengaturan Membership</h1>

      {/* ===== Tier Diskon ===== */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Tier Diskon Berdasar Poin</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Contoh: member dengan minimal 1000 poin dapat diskon 10% kalau belanja minimal
              Rp500.000. Kalau member memenuhi beberapa tier sekaligus, sistem otomatis pakai yang
              diskonnya paling besar.
            </p>
          </div>
          <button
            onClick={() => setTierFormOpen((v) => !v)}
            className="bg-brand text-white rounded-lg px-3 py-1.5 text-sm shrink-0"
          >
            + Tambah Tier
          </button>
        </div>

        {tierFormOpen && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <input
              value={namaTier}
              onChange={(e) => setNamaTier(e.target.value)}
              placeholder="Nama tier (opsional)"
              className="border rounded-lg px-2 py-1.5 text-sm col-span-2 md:col-span-1"
            />
            <input
              type="number"
              value={minimalPoin}
              onChange={(e) => setMinimalPoin(e.target.value)}
              placeholder="Minimal poin"
              className="border rounded-lg px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              value={diskonPersen}
              onChange={(e) => setDiskonPersen(e.target.value)}
              placeholder="Diskon (%)"
              className="border rounded-lg px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              value={minimalBelanja}
              onChange={(e) => setMinimalBelanja(e.target.value)}
              placeholder="Min. belanja (Rp, opsional)"
              className="border rounded-lg px-2 py-1.5 text-sm"
            />
            <div className="col-span-2 md:col-span-4 flex items-center gap-2">
              {tierError && <p className="text-red-500 text-xs">{tierError}</p>}
              <button
                onClick={handleTambahTier}
                disabled={tierSaving}
                className="bg-brand text-white rounded-lg px-3 py-1.5 text-xs disabled:opacity-50 ml-auto"
              >
                {tierSaving ? "Menyimpan..." : "Simpan Tier"}
              </button>
            </div>
          </div>
        )}

        {tiers.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Belum ada tier diskon.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left border-b">
              <tr>
                <th className="py-2">Nama Tier</th>
                <th className="py-2">Minimal Poin</th>
                <th className="py-2">Diskon</th>
                <th className="py-2">Min. Belanja</th>
                <th className="py-2">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2">{t.nama_tier}</td>
                  <td className="py-2">{t.minimal_poin.toLocaleString("id-ID")}</td>
                  <td className="py-2 font-medium text-brand">{t.diskon_persen}%</td>
                  <td className="py-2">
                    {t.minimal_belanja > 0 ? `Rp${t.minimal_belanja.toLocaleString("id-ID")}` : "-"}
                  </td>
                  <td className="py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        t.is_aktif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.is_aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-2 text-right space-x-2">
                    <button
                      onClick={() => handleToggleTier(t)}
                      className="text-gray-500 hover:text-brand"
                      title={t.is_aktif ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <Power size={14} className="inline" />
                    </button>
                    <button
                      onClick={() => handleDeleteTier(t.id)}
                      className="text-red-500"
                      title="Hapus"
                    >
                      <Trash2 size={14} className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== Poin per Produk ===== */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-1">Poin per Produk</h2>
        <p className="text-xs text-gray-500 mb-3">
          Atur berapa poin didapat member setiap membeli 1 satuan produk tertentu (per pcs/eceran,
          atau per satuan besar seperti dos/renceng). Isi 0 kalau produk itu gak menghasilkan poin.
        </p>

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm"
          />
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredProduk.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-6">
              {query ? `Gak ada produk yang cocok dengan "${query}".` : "Belum ada produk."}
            </p>
          ) : (
            filteredProduk.map((p) => (
              <div key={p.id} className="border rounded-lg p-3">
                <div className="text-sm font-medium mb-2">{p.nama}</div>
                <div className="flex flex-wrap gap-3">
                  {p.units.map((u) => {
                    const unitKey = u.product_unit_id ?? "base";
                    const savingThis = savingKey === `${p.id}-${unitKey}`;
                    return (
                      <div key={unitKey} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
                        <span className="text-xs text-gray-500">{u.satuan}:</span>
                        <input
                          type="number"
                          min={0}
                          defaultValue={u.poin}
                          onBlur={(e) =>
                            handlePoinChange(p.id, unitKey, u.product_unit_id, e.target.value)
                          }
                          className="w-16 border rounded px-1.5 py-1 text-xs text-center"
                        />
                        <span className="text-xs text-gray-400">poin</span>
                        {savingThis && <span className="text-xs text-brand">...</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}