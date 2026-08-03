"use client";

import { useTransition } from "react";
import { deleteOrder } from "@/app/(app)/admin/orders/actions";

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Naozaj zmazať túto objednávku? Zmažú sa aj jej faktúry.")) return;
    startTransition(() => {
      deleteOrder(orderId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="btn-danger btn-sm"
    >
      {isPending ? "Mažem…" : "Odstrániť"}
    </button>
  );
}
