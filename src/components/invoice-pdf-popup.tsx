"use client";

import { useEffect, useState, useTransition } from "react";
import { getInvoicePdfPreviewUrl } from "@/app/(app)/admin/orders/actions";

/** Číslo faktúry (badge), po kliknutí otvorí PDF vo vyskakovacom okne. */
export function InvoicePdfPopup({
  invoiceId,
  invoiceNumber,
  sent,
}: {
  invoiceId: string;
  invoiceNumber: string;
  sent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    setUrl(null);
    setError(null);
    startTransition(async () => {
      const res = await getInvoicePdfPreviewUrl(invoiceId);
      if (res.ok) setUrl(res.url);
      else setError(res.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={sent ? "badge-success" : "badge-neutral"}
        title={sent ? "Faktúra odoslaná Petrovi — klikni pre zobrazenie" : "Faktúra ešte neodoslaná — klikni pre zobrazenie"}
      >
        {sent ? "✓ " : ""}
        {invoiceNumber}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Faktúra ${invoiceNumber}`}
        >
          <div
            className="card flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-2.5">
              <h3 className="font-semibold text-ink-900">Faktúra {invoiceNumber}</h3>
              <div className="flex items-center gap-2">
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                    Otvoriť v novej karte
                  </a>
                )}
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary btn-sm">
                  Zavrieť
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-white">
              {url ? (
                <iframe src={url} title={`Faktúra ${invoiceNumber}`} className="h-full w-full" />
              ) : (
                <p className="p-6 text-sm text-ink-500">{error ?? (isPending ? "Načítavam…" : "")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
