"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LupaPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setErrorMsg("Gagal mengirim link reset. Coba lagi.");
      return;
    }

    setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <img src="/866x288.png" alt="Maesa Mart" className="h-10 w-auto mx-auto mb-6" />
        <div className="bg-surface border border-line rounded-2xl p-6">
          <h1 className="font-display text-lg font-semibold mb-2">Lupa Kata Sandi</h1>

          {sent ? (
            <p className="text-sm text-ink-soft">
              Link reset kata sandi sudah dikirim ke <span className="font-medium">{email}</span>.
              Cek inbox atau folder spam, klik link-nya buat bikin kata sandi baru.
            </p>
          ) : (
            <>
              <p className="text-xs text-ink-soft mb-4">
                Masukkan email yang dipakai waktu daftar, link reset kata sandi bakal dikirim ke situ.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border border-line rounded-xl w-full px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brand"
                />
                {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? "Mengirim..." : "Kirim Link Reset"}
                </button>
              </form>
            </>
          )}

          <p className="text-xs text-ink-soft text-center mt-4">
            <a href="/login" className="text-brand underline">
              Kembali ke login
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}