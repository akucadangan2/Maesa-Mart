"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Link dari email otomatis bikin sesi "recovery" pas halaman ini dibuka.
    // Form baru ditampilkan setelah sesi itu benar-benar terbentuk.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal 6 karakter.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMsg("Gagal mengubah kata sandi: " + error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/akun");
    }, 1500);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <img src="/866x288.png" alt="Maesa Mart" className="h-10 w-auto mx-auto mb-6" />
        <div className="bg-surface border border-line rounded-2xl p-6">
          <h1 className="font-display text-lg font-semibold mb-4">Buat Kata Sandi Baru</h1>

          {!ready ? (
            <p className="text-sm text-ink-soft">Memeriksa link reset...</p>
          ) : success ? (
            <p className="text-sm text-brand">Kata sandi berhasil diubah, mengalihkan...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Kata sandi baru"
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
                {loading ? "Menyimpan..." : "Simpan Kata Sandi"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}