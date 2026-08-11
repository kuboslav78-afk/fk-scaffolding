"use client";

import { useTransition } from "react";
import { deleteContact } from "@/app/(app)/admin/orders/prep/actions";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Naozaj zmazať tento kontakt?")) return;
    startTransition(() => {
      deleteContact(contactId);
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="btn-danger btn-sm">
      {isPending ? "Mažem…" : "Zmazať"}
    </button>
  );
}
