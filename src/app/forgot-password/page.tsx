"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CosmicDustBackground } from "@/components/cosmic-dust-background";

function ForgotPasswordForm() {
  const supabase = createClient();
  const expired = useSearchParams().get("expired");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError("Odoslanie zlyhalo, skús to o chvíľu znova.");
      return;
    }
    setSent(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-10 w-full max-w-sm space-y-5 rounded-2xl border border-[#332f28] bg-[#1c1a17] p-8"
    >
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold text-[#f2ede2]">Zabudnuté heslo</h1>
        <p className="text-sm text-[#9a9186]">Pošleme ti odkaz na nastavenie nového hesla.</p>
      </div>

      {expired && (
        <p className="text-sm text-red-400">Odkaz je neplatný alebo vypršal. Pošli si nový.</p>
      )}

      {sent ? (
        <p className="text-sm text-amber-300">
          Ak účet s týmto emailom existuje, poslali sme naň odkaz. Otvor ho v tom istom prehliadači.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <label className="mb-1 block text-xs font-medium text-[#b7ad9e]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#332f28] bg-[#141210] px-3 py-2 text-sm text-[#f2ede2] focus:border-[#f0a23a] focus:outline-none focus:ring-2 focus:ring-[#f0a23a]/20"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-br from-[#ffcf7a] to-[#f0a23a] px-3.5 py-2.5 text-sm font-semibold text-[#241a06] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Odosielam…" : "Poslať odkaz"}
          </button>
        </>
      )}

      <div className="text-center">
        <Link href="/login" className="text-xs text-[#9a9186] hover:text-[#f0a23a]">
          Späť na prihlásenie
        </Link>
      </div>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0908] px-4">
      <CosmicDustBackground />
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
