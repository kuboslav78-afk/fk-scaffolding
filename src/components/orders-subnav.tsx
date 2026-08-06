import Link from "next/link";

export function OrdersSubnav({ active }: { active: "orders" | "invoices" }) {
  return (
    <div className="flex gap-1 border-b border-ink-100">
      <Link
        href="/admin/orders"
        className={
          active === "orders"
            ? "border-b-2 border-brand-500 px-3 py-2 text-sm font-medium text-brand-400"
            : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-500 hover:text-ink-900"
        }
      >
        Objednávky
      </Link>
      <Link
        href="/admin/orders/invoices"
        className={
          active === "invoices"
            ? "border-b-2 border-brand-500 px-3 py-2 text-sm font-medium text-brand-400"
            : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-500 hover:text-ink-900"
        }
      >
        Faktúry
      </Link>
    </div>
  );
}
