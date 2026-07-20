"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Lock, Unlock } from "lucide-react";

export default function KasirLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setErrorMsg("Email atau password salah.");
      setLoading(false);
      return;
    }

    const role = data.user.app_metadata?.role;
    if (role !== "admin" && role !== "kasir" && role !== "super_admin") {
      setErrorMsg("Akun ini bukan akun staff toko.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push("/kasir");
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
          <p className="text-sm text-gray-500">Login untuk menggunakan aplikasi</p>

          <div className="flex items-stretch border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand">
            <input
              type="email"
              placeholder="Email/Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-3 py-2.5 text-sm outline-none min-w-0"
            />
            <div className="w-11 flex items-center justify-center bg-gray-100 border-l shrink-0">
              <User size={16} className="text-gray-500" />
            </div>
          </div>

          <div className="flex items-stretch border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex-1 px-3 py-2.5 text-sm outline-none min-w-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="w-11 flex items-center justify-center bg-gray-100 border-l shrink-0"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? (
                <Unlock size={16} className="text-gray-500" />
              ) : (
                <Lock size={16} className="text-gray-500" />
              )}
            </button>
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
        </form>
      </div>
    </main>
  );
}