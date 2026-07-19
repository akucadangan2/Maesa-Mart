"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DaftarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error || !data.user) {
      setErrorMsg(error?.message ?? "Gagal mendaftar.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("customers").insert({
      id: data.user.id,
      nama,
      no_hp: noHp,
    });

    if (profileError) {
      setErrorMsg(
        profileError.message.includes("customers_no_hp_key")
          ? "No HP ini sudah terdaftar."
          : "Akun dibuat, tapi gagal menyimpan profil: " + profileError.message
      );
      setLoading(false);
      return;
    }

    router.push("/akun");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full">
        <img src="/866x288.png" alt="Maesa Mart" className="h-10 w-auto mx-auto mb-6" />
        <div className="bg-surface border border-line rounded-2xl p-6">
          <h1 className="font-display text-lg font-semibold mb-4">Daftar Pelanggan</h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              placeholder="Nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              type="tel"
              placeholder="No HP"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              required
              inputMode="numeric"
              className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Kata sandi (min 6 karakter)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border border-line rounded-xl w-full px-3 py-2.5 pr-10 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Mendaftar..." : "Daftar"}
            </button>
          </form>
          <p className="text-xs text-ink-soft text-center mt-4">
            Sudah punya akun?{" "}
            <a href="/login" className="text-brand underline">
              Login di sini
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}