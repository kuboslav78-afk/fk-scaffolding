"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CosmicDustBackground } from "@/components/cosmic-dust-background";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient();
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Heslo musí mať aspoň 8 znakov.");
      return;
    }
    if (password !== confirm) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("Nastavenie hesla zlyhalo. Skús si poslať nový odkaz.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-[#332f28] bg-[#141210] px-3 py-2 text-sm text-[#f2ede2] focus:border-[#f0a23a] focus:outline-none focus:ring-2 focus:ring-[#f0a23a]/20";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0908] px-4">
      <CosmicDustBackground />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm space-y-5 rounded-2xl border border-[#332f28] bg-[#1c1a17] p-8"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-[#f2ede2]">Nové heslo</h1>
          <p className="text-sm text-[#9a9186]">Nastav si nové heslo do portálu.</p>
        </div>

        <div className="space-y-1">
          <label className="mb-1 block text-xs font-medium text-[#b7ad9e]">Nové heslo</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="mb-1 block text-xs font-medium text-[#b7ad9e]">Zopakuj heslo</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-br from-[#ffcf7a] to-[#f0a23a] px-3.5 py-2.5 text-sm font-semibold text-[#241a06] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Ukladám…" : "Uložiť heslo"}
        </button>
      </form>
    </div>
  );
}
