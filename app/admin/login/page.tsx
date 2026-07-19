"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
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

    if (data.user.app_metadata?.role !== "admin") {
      setErrorMsg("Akun ini bukan akun admin.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="max-w-sm mx-auto p-6 pt-24">
      <h1 className="text-xl font-bold mb-4">Login Admin</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border rounded-lg w-full px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border rounded-lg w-full px-3 py-2 text-sm"
        />
        {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white rounded-lg py-2 text-sm w-full disabled:opacity-50"
        >
          {loading ? "Masuk..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}