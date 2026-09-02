import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";
import { OrdersSubnav } from "@/components/orders-subnav";
import { InvoicesTable, type InvoiceGroup } from "@/components/invoices-table";
import { MONTH_NAMES, parseMonthParam, monthRange } from "@/lib/month";

function contractsLabel(count: number) {
  if (count === 1) return "1 zmluva";
  if (count >= 2 && count <= 4) return `${count} zmluvy`;
  return `${count} zmlúv`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);
  const { rangeStart, rangeEnd, prevParam, nextParam } = monthRange(year, monthIndex);

  const supabase = await createClient();

  const [{ data: invoices }, { data: contacts }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, amount, issued_date, due_date, sent, paid, pdf_path, orders(order_number, customer_name, sites(name, short_name))"
      )
      .gte("issued_date", rangeStart)
      .lt("issued_date", rangeEnd)
      .order("issued_date", { ascending: false }),
    supabase.from("email_contacts").select("name, email"),
  ]);

  const peterContact = contacts?.find((c) => c.name.toLowerCase().includes("peter"));

  // Jedna fyzická faktúra môže mať viac riadkov v DB (jeden na objednávku) — zoskupíme
  // podľa čísla faktúry, aby sa v prehľade aj pri odosielaní zobrazovala/posielala len raz.
  const groupsMap = new Map<string, Omit<InvoiceGroup, "orderLabel" | "pdfUrl">>();
  for (const i of invoices ?? []) {
    // @ts-expect-error supabase join shape
    const orderNumber: string = i.orders?.order_number ?? i.orders?.sites?.short_name ?? i.orders?.sites?.name ?? "—";
    // @ts-expect-error supabase join shape
    const customerName: string = i.orders?.customer_name ?? "—";
    const existing = groupsMap.get(i.invoice_number);
    if (existing) {
      existing.ids.push(i.id);
      existing.amount += i.amount;
      existing.orderNumbers.push(orderNumber);
      existing.sent = existing.sent && i.sent;
      existing.paid = existing.paid && i.paid;
    } else {
      groupsMap.set(i.invoice_number, {
        invoiceNumber: i.invoice_number,
        ids: [i.id],
        amount: i.amount,
        issued_date: i.issued_date,
        due_date: i.due_date,
        sent: i.sent,
        paid: i.paid,
        hasPdf: !!i.pdf_path,
        pdfPath: i.pdf_path,
        orderNumbers: [orderNumber],
        customerName,
      });
    }
  }

  const groupsArr = [...groupsMap.values()];
  const pdfUrlByInvoiceNumber = new Map<string, string>();
  const groupsWithPdf = groupsArr.filter((g) => g.pdfPath);
  if (groupsWithPdf.length) {
    const admin = createAdminClient();
    const { data: signedUrls } = await admin.storage
      .from("invoice-pdfs")
      .createSignedUrls(
        groupsWithPdf.map((g) => g.pdfPath as string),
        3600
      );
    groupsWithPdf.forEach((g, i) => {
      const url = signedUrls?.[i]?.signedUrl;
      if (url) pdfUrlByInvoiceNumber.set(g.invoiceNumber, url);
    });
  }

  const groups = groupsArr
    .map((g) => ({
      ...g,
      pdfUrl: pdfUrlByInvoiceNumber.get(g.invoiceNumber) ?? null,
      orderLabel:
        g.orderNumbers.length === 1
          ? `${g.orderNumbers[0]} · ${g.customerName}`
          : `${contractsLabel(g.orderNumbers.length)} (${g.orderNumbers.join(", ")}) · ${g.customerName}`,
    }))
    .sort((a, b) => b.issued_date.localeCompare(a.issued_date));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Faktúry</h1>
        <Link href="/admin/orders/invoices/new" className="btn-primary">
          + Nová faktúra
        </Link>
      </div>

      <OrdersSubnav active="invoices" />

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">
          {MONTH_NAMES[monthIndex]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Link href={`/admin/orders/invoices?month=${prevParam}`} className="btn-ghost btn-sm px-2">
            ←
          </Link>
          <Link href="/admin/orders/invoices" className="btn-ghost btn-sm">
            dnes
          </Link>
          <Link href={`/admin/orders/invoices?month=${nextParam}`} className="btn-ghost btn-sm px-2">
            →
          </Link>
        </div>
      </div>

      <InvoicesTable groups={groups} peterEmail={peterContact?.email ?? null} adminName={profile.full_name} />
    </div>
  );
}
