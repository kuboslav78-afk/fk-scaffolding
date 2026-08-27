"use client";

import { useRef, useState, useTransition } from "react";
import { importFuelStatementPdf } from "@/app/(app)/admin/fuel-cards/actions";

export function FuelImportForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    const formData = new FormData();
    formData.set("pdf", file);

    startTransition(async () => {
      const res = await importFuelStatementPdf(formData);
      if (res.ok) {
        setIsError(false);
        const parts = [`Naimportovaných ${res.inserted} tankovaní.`];
        if (res.skipped) parts.push(`${res.skipped} už bolo v systéme (preskočené).`);
        if (res.unmatchedCards.length) parts.push(`Nenájdené karty: ${res.unmatchedCards.join(", ")}.`);
        setResult(parts.join(" "));
      } else {
        setIsError(true);
        setResult(res.error);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 font-semibold text-ink-900">Import PDF výkazu (UTA)</h2>
      <p className="mb-3 text-xs text-ink-400">
        Nahraj "Doklad s jednotlivými položkami" — tankovania sa automaticky priradia ku kartám podľa čísla
        karty vo výkaze. Opakovaný import toho istého výkazu sa preskočí.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelected}
        disabled={isPending}
        className="block w-full text-sm"
      />
      {isPending && <p className="label mt-1">Načítavam PDF…</p>}
      {result && <p className={`mt-2 text-sm ${isError ? "text-red-400" : "text-ink-600"}`}>{result}</p>}
    </div>
  );
}
