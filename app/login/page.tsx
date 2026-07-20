"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Lock, Unlock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [noHp, setNoHp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { data: email, error: lookupError } = await supabase.rpc("get_email_by_no_hp", {
      p_no_hp: noHp.trim(),
    });

    if (lookupError || !email) {
      setErrorMsg("No HP atau kata sandi salah.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setErrorMsg("No HP atau kata sandi salah.");
      setLoading(false);
      return;
    }

    router.push("/akun");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="h-1.5 bg-brand" />

        <div className="px-8 pt-8 pb-6 flex flex-col items-center border-b">
          <img src="/866x288.png" alt="Maesa Mart" className="h-16 w-auto object-contain" />
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <p className="text-sm text-gray-500">Login untuk pesan & lihat riwayat belanjamu</p>

          <div className="flex items-stretch border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand">
            <input
              type="tel"
              placeholder="No HP"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              required
              inputMode="numeric"
              className="flex-1 px-3 py-2.5 text-sm outline-none min-w-0"
            />
            <div className="w-11 flex items-center justify-center bg-gray-100 border-l shrink-0">
              <Phone size={16} className="text-gray-500" />
            </div>
          </div>

          <div className="flex items-stretch border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex-1 px-3 py-2.5 text-sm outline-none min-w-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="w-11 flex items-center justify-center bg-gray-100 border-l shrink-0"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? (
                <Unlock size={16} className="text-gray-500" />
              ) : (
                <Lock size={16} className="text-gray-500" />
              )}
            </button>
          </div>

          <div className="text-right -mt-2">
            <a href="/lupa-password" className="text-xs text-brand underline">
              Lupa kata sandi?
            </a>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white rounded-lg py-3 text-sm font-medium disabled:opacity-50 hover:bg-brand-dark transition-colors"
          >
            {loading ? "Masuk..." : "Sign In"}
          </button>

          <p className="text-xs text-gray-500 text-center pt-1">
            Belum punya akun?{" "}
            <a href="/daftar" className="text-brand underline">
              Daftar di sini
            </a>
          </p>
        </form>
      </div>

      <a
        href="/order"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 underline bg-white/80 px-3 py-1.5 rounded-full"
      >
        Lanjut belanja tanpa login
      </a>
    </main>
  );
}