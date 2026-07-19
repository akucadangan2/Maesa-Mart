"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function KasirLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (role !== "admin" && role !== "kasir") {
      setErrorMsg("Akun ini bukan akun staff toko.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push("/kasir");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-sm w-full">
        <img src="/866x288.png" alt="Maesa Mart" className="h-10 w-auto mx-auto mb-6" />
        <div className="bg-white border rounded-2xl p-6">
          <h1 className="text-lg font-semibold mb-4">Login Kasir</h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border rounded-xl w-full px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border rounded-xl w-full px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Masuk..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}