"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScaffoldDecoration } from "@/components/scaffold-decoration";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-50 px-4">
      <ScaffoldDecoration side="left" />
      <ScaffoldDecoration side="right" />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm space-y-5 rounded-2xl border border-ink-100 bg-white p-8 shadow-[0_8px_30px_rgba(23,21,15,0.08)]"
      >
        <div className="space-y-1 text-center">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            FK
          </span>
          <h1 className="text-xl font-semibold text-ink-900">FK Scaffolding</h1>
          <p className="text-sm text-ink-500">Prihlásenie zamestnanca</p>
        </div>

        <div className="space-y-1">
          <label className="label">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Heslo</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Prihlasujem…" : "Prihlásiť sa"}
        </button>
      </form>
    </div>
  );
}
