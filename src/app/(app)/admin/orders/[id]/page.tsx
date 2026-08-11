import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";

const WORK_TYPE_LABELS: Record<string, string> = {
  montaz: "Montáž",
  demontaz: "Demontáž",
  hodiny: "Hodinovka",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, work_type, order_date, start_date, handover_date, price, contribution_amount, hours, hourly_rate, peter_invoice_issued, peter_invoice_date, note, description, pdf_path, sites(name, short_name)"
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  // @ts-expect-error supabase join shape
  const siteName: string = order.sites?.short_name || order.sites?.name || "bez stavby";
  // @ts-expect-error supabase join shape
  const siteFullName: string | null = order.sites?.short_name ? order.sites?.name : null;

  const isHourly = order.work_type === "hodiny";
  const myInvoiceAmount = isHourly
    ? order.hours != null && order.hourly_rate != null
      ? order.hours * order.hourly_rate
      : order.price
    : order.price != null
      ? order.price * 0.8
      : null;

  let pdfUrl: string | null = null;
  if (order.pdf_path) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage.from("order-pdfs").createSignedUrl(order.pdf_path, 3600);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <Link href="/admin/orders" className="text-sm text-ink-500 hover:text-ink-900">
        ← Späť na objednávky
      </Link>

      <div className="card space-y-1 p-6">
        <p className="text-sm text-ink-500">Objednávka č. {order.order_number ?? "—"}</p>
        <h1 className="text-2xl font-semibold text-ink-900">{siteName}</h1>
        {siteFullName && <p className="text-sm text-ink-400">{siteFullName}</p>}
      </div>

      <div className="card p-6">
        <p className="label">Moja faktúra</p>
        <p className="text-4xl font-semibold text-ink-900">
          {myInvoiceAmount != null ? `${myInvoiceAmount.toFixed(2)} €` : "—"}
        </p>
        {!isHourly && order.price != null && (
          <p className="mt-2 text-sm text-ink-400">
            Celková suma objednávky: {order.price.toFixed(2)} € · SUKA:{" "}
            {(order.contribution_amount ?? order.price * 0.1).toFixed(2)} €
          </p>
        )}
        {isHourly && order.hours != null && (
          <p className="mt-2 text-sm text-ink-400">
            {order.hours} h × {order.hourly_rate} €/h
          </p>
        )}
      </div>

      <div className="card grid grid-cols-2 gap-4 p-6 text-sm">
        <div>
          <p className="label">Zákazník</p>
          <p className="text-ink-900">{order.customer_name ?? "—"}</p>
        </div>
        <div>
          <p className="label">Typ práce</p>
          <p className="text-ink-900">{order.work_type ? WORK_TYPE_LABELS[order.work_type] : "—"}</p>
        </div>
        <div>
          <p className="label">Dátum objednávky</p>
          <p className="text-ink-900">{order.order_date}</p>
        </div>
        <div>
          <p className="label">Termín</p>
          <p className="text-ink-900">
            {order.start_date ? `${order.start_date} → ${order.handover_date ?? "?"}` : "—"}
          </p>
        </div>
        <div>
          <p className="label">Dátum vystavenia</p>
          <p className="text-ink-900">
            {order.peter_invoice_issued ? `✓ ${order.peter_invoice_date ?? ""}` : "zatiaľ nie"}
          </p>
        </div>
        {pdfUrl && (
          <div>
            <p className="label">PDF objednávky</p>
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-ink-900 underline">
              Otvoriť PDF
            </a>
          </div>
        )}
      </div>

      {(order.description || order.note) && (
        <div className="card space-y-3 p-6 text-sm">
          {order.description && (
            <div>
              <p className="label">Popis práce</p>
              <p className="whitespace-pre-wrap text-ink-700">{order.description}</p>
            </div>
          )}
          {order.note && (
            <div>
              <p className="label">Poznámka</p>
              <p className="whitespace-pre-wrap text-ink-700">{order.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
