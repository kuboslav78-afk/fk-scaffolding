"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScaffoldDecoration } from "@/components/scaffold-decoration";
import { LoginTrail } from "@/components/login-trail";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Nesprávny email alebo heslo.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0908] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_560px_at_50%_-12%,#2a2620_0%,transparent_60%)]" />

      <ScaffoldDecoration side="left" />
      <ScaffoldDecoration side="right" />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm space-y-5 rounded-2xl border border-[#332f28] bg-[#1c1a17] p-8 shadow-[0_0_0_1px_rgba(240,162,58,0.06),0_45px_90px_-30px_rgba(0,0,0,0.75),0_0_70px_-20px_rgba(240,162,58,0.18)]"
      >
        <LoginTrail />

        <div className="space-y-1 text-center">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffcf7a] to-[#f0a23a] text-sm font-bold text-[#241a06] shadow-[0_0_22px_-2px_rgba(240,162,58,0.7)]">
            FK
          </span>
          <h1 className="text-xl font-semibold text-[#f2ede2]">FK Scaffolding</h1>
          <p className="text-sm text-[#9a9186]">Prihlásenie zamestnanca — nočná zmena</p>
        </div>

        <div className="space-y-1">
          <label className="mb-1 block text-xs font-medium text-[#b7ad9e]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#332f28] bg-[#141210] px-3 py-2 text-sm text-[#f2ede2] placeholder:text-[#5c574d] focus:border-[#f0a23a] focus:outline-none focus:ring-2 focus:ring-[#f0a23a]/20"
          />
        </div>

        <div className="space-y-1">
          <label className="mb-1 block text-xs font-medium text-[#b7ad9e]">Heslo</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#332f28] bg-[#141210] px-3 py-2 text-sm text-[#f2ede2] placeholder:text-[#5c574d] focus:border-[#f0a23a] focus:outline-none focus:ring-2 focus:ring-[#f0a23a]/20"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-br from-[#ffcf7a] to-[#f0a23a] px-3.5 py-2.5 text-sm font-semibold text-[#241a06] shadow-[0_0_30px_-6px_rgba(240,162,58,0.7)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Prihlasujem…" : "Prihlásiť sa"}
        </button>
      </form>
    </div>
  );
}
