"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <img src="/866x288.png" alt="Maesa Mart" className="h-10 w-auto mx-auto mb-6" />
        <div className="bg-surface border border-line rounded-2xl p-6">
          <h1 className="font-display text-lg font-semibold mb-4">Login Pelanggan</h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="tel"
              placeholder="No HP"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              required
              inputMode="numeric"
              className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

            <div className="text-right">
              <a href="/lupa-password" className="text-xs text-brand underline">
                Lupa kata sandi?
              </a>
            </div>

            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Masuk..." : "Masuk"}
            </button>
          </form>
          <p className="text-xs text-ink-soft text-center mt-4">
            Belum punya akun?{" "}
            <a href="/daftar" className="text-brand underline">
              Daftar di sini
            </a>
          </p>
        </div>
        <a href="/order" className="block text-center text-xs text-ink-soft mt-4 underline">
          Lanjut belanja tanpa login
        </a>
      </div>
    </main>
  );
}