import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";
import { EditableOrderRow } from "@/components/editable-order-row";
import { OrdersSubnav } from "@/components/orders-subnav";

const MONTH_NAMES = [
  "Január",
  "Február",
  "Marec",
  "Apríl",
  "Máj",
  "Jún",
  "Júl",
  "August",
  "September",
  "Október",
  "November",
  "December",
];

function parseMonthParam(month: string | undefined): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function monthParamString(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);

  const monthParam = monthParamString(year, monthIndex);
  const nextMonthDate = new Date(year, monthIndex + 1, 1);

  const prevMonthDate = new Date(year, monthIndex - 1, 1);
  const prevParam = monthParamString(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
  const nextParam = monthParamString(nextMonthDate.getFullYear(), nextMonthDate.getMonth());

  const supabase = await createClient();

  const [{ data: sites }, { data: monthOrders }] = await Promise.all([
    supabase.from("sites").select("id, name, short_name, project_number").order("name"),
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, work_type, order_date, display_month, start_date, handover_date, price, contribution_amount, hours, hourly_rate, peter_invoice_issued, peter_invoice_date, note, site_id, pdf_path, sites(name, short_name)"
      )
      .eq("display_month", monthParam)
      .order("created_at", { ascending: true }),
  ]);

  const pdfUrlByOrder = new Map<string, string>();
  const ordersWithPdf = (monthOrders ?? []).filter((o) => o.pdf_path);
  if (ordersWithPdf.length) {
    const admin = createAdminClient();
    const { data: signedUrls } = await admin.storage
      .from("order-pdfs")
      .createSignedUrls(
        ordersWithPdf.map((o) => o.pdf_path as string),
        3600
      );
    ordersWithPdf.forEach((o, i) => {
      const url = signedUrls?.[i]?.signedUrl;
      if (url) pdfUrlByOrder.set(o.id, url);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Objednávky</h1>
        <Link href="/admin/orders/new" className="btn-primary">
          + Nová objednávka
        </Link>
      </div>

      <OrdersSubnav active="orders" />

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">
          {MONTH_NAMES[monthIndex]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Link href={`/admin/orders?month=${prevParam}`} className="btn-ghost btn-sm px-2">
            ←
          </Link>
          <Link href="/admin/orders" className="btn-ghost btn-sm">
            dnes
          </Link>
          <Link href={`/admin/orders?month=${nextParam}`} className="btn-ghost btn-sm px-2">
            →
          </Link>
        </div>
      </div>

      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[760px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[140px]" />
            <col className="w-[110px]" />
            <col className="w-[100px]" />
            <col className="w-[180px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-2">Číslo</th>
              <th className="pb-2 pr-2">Stavba</th>
              <th className="pb-2 pr-2">Termín ukončenia</th>
              <th className="pb-2 pr-2">Moja faktúra</th>
              <th className="pb-2 pr-2">Dátum vystavenia</th>
              <th className="pb-2">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {monthOrders?.map((o) => (
              <EditableOrderRow
                key={o.id}
                order={{
                  id: o.id,
                  order_number: o.order_number,
                  customer_name: o.customer_name,
                  work_type: o.work_type,
                  order_date: o.order_date,
                  display_month: o.display_month,
                  start_date: o.start_date,
                  handover_date: o.handover_date,
                  price: o.price,
                  contribution_amount: o.contribution_amount,
                  hours: o.hours,
                  hourly_rate: o.hourly_rate,
                  peter_invoice_issued: o.peter_invoice_issued,
                  peter_invoice_date: o.peter_invoice_date,
                  note: o.note,
                  site_id: o.site_id,
                  // @ts-expect-error supabase join shape
                  siteName: o.sites?.short_name || o.sites?.name || "bez stavby",
                }}
                sites={sites ?? []}
                pdfUrl={pdfUrlByOrder.get(o.id) ?? null}
              />
            ))}
          </tbody>
        </table>
        {!monthOrders?.length && (
          <p className="py-4 text-sm text-ink-400">Žiadne objednávky za tento mesiac.</p>
        )}
      </div>
    </div>
  );
}
