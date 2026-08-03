"use client";

import { useTransition } from "react";
import { deleteOrder } from "@/app/admin/orders/actions";

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
      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
    >
      {isPending ? "Mažem…" : "Odstrániť"}
    </button>
  );
}
