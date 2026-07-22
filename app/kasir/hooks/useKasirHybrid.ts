"use client";

import { useState } from "react";
import { searchKasirItems, createPosSale, getRiwayatKasirHariIni, type KasirSearchResult } from "../actions";

const LOCAL_SERVER_KEY = "maesa_local_server_url";

export function getLocalServerUrl(): string {
  if (typeof window === "undefined") return "http://localhost:4000";
  return window.localStorage.getItem(LOCAL_SERVER_KEY) || "http://localhost:4000";
}

export function setLocalServerUrlPref(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_SERVER_KEY, url);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * Semua pemanggilan data Kasir lewat hook ini: coba dulu ke Supabase (server
 * action biasa), kalau gagal/timeout (>4 detik, tandanya internet toko lagi
 * putus) otomatis jatuh ke server lokal (http://localhost:4000 atau alamat
 * custom yang di-setting lewat LocalServerSettingsModal).
 */
export function useKasirHybrid(staffId: string) {
  const [modeOffline, setModeOffline] = useState(false);

  async function cariProdukHybrid(q: string): Promise<KasirSearchResult[]> {
    try {
      const data = await withTimeout(searchKasirItems(q), 4000);
      setModeOffline(false);
      return data;
    } catch {
      setModeOffline(true);
      try {
        const res = await fetch(`${getLocalServerUrl()}/api/produk/search?q=${encodeURIComponent(q)}`);
        return await res.json();
      } catch {
        return [];
      }
    }
  }

  async function buatPenjualanHybrid(payload: Parameters<typeof createPosSale>[0]) {
    try {
      const result = await withTimeout(createPosSale(payload), 4000);
      setModeOffline(false);
      return result;
    } catch {
      setModeOffline(true);
      const res = await fetch(`${getLocalServerUrl()}/api/kasir/jual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Gagal simpan transaksi, server lokal juga gak bisa diakses.");
      }
      return await res.json();
    }
  }

  async function riwayatHybrid(): Promise<any[]> {
    try {
      const data = await withTimeout(getRiwayatKasirHariIni(staffId), 4000);
      setModeOffline(false);
      return data;
    } catch {
      setModeOffline(true);
      try {
        const res = await fetch(`${getLocalServerUrl()}/api/kasir/riwayat-hari-ini?kasir_id=${staffId}`);
        return await res.json();
      } catch {
        return [];
      }
    }
  }

  return { modeOffline, cariProdukHybrid, buatPenjualanHybrid, riwayatHybrid };
}
