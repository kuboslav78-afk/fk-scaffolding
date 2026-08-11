import { redirect } from "next/navigation";
import { getProfile } from "@/lib/get-profile";
import { OrdersSubnav } from "@/components/orders-subnav";
import { ImportInvoicesForm } from "@/components/import-invoices-form";

export default async function ImportInvoicesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Objednávky</h1>

      <OrdersSubnav active="import" />

      <div>
        <h2 className="mb-1 font-semibold text-ink-900">Import faktúr od účtovníčky</h2>
        <p className="text-sm text-ink-500">
          Zadaj čísla objednávok a vystavené faktúry naraz. Skontroluj pred uložením — systém overí,
          či objednávka existuje, ešte nemá faktúru, a či suma sedí s očakávanou (80% z ceny).
        </p>
      </div>

      <ImportInvoicesForm />
    </div>
  );
}
