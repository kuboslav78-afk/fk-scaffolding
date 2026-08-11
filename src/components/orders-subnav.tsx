import Link from "next/link";

type Tab = "orders" | "invoices" | "prep" | "import";

const TABS: { key: Tab; href: string; label: string }[] = [
  { key: "orders", href: "/admin/orders", label: "Objednávky" },
  { key: "invoices", href: "/admin/orders/invoices", label: "Faktúry" },
  { key: "prep", href: "/admin/orders/prep", label: "Podklady pre FA" },
  { key: "import", href: "/admin/orders/import", label: "Import faktúr" },
];

export function OrdersSubnav({ active }: { active: Tab }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-ink-100">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            active === tab.key
              ? "border-b-2 border-brand-500 px-3 py-2 text-sm font-medium text-brand-400"
              : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-500 hover:text-ink-900"
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
