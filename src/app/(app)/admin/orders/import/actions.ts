"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { addDaysISO, addMonthsISO } from "@/lib/dates";
import { parseInvoicePdf } from "@/lib/parse-invoice-pdf";

export type ImportRow = {
  key: string;
  orderNumber: string;
  invoiceNumber: string;
  amount: number;
  peterDate: string;
};

export type ParsedInvoiceRow = {
  fileName: string;
  invoiceNumber: string | null;
  contractRef: string | null;
  amount: number | null;
  issuedDate: string | null;
  error: string | null;
};

export async function parseInvoicePdfsAction(formData: FormData): Promise<ParsedInvoiceRow[]> {
  const requester = await getProfile();
  if (requester?.role !== "admin") return [];

  const files = formData.getAll("pdfs").filter((f): f is File => f instanceof File);
  const results: ParsedInvoiceRow[] = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parseInvoicePdf(buffer);
      results.push({
        fileName: file.name,
        invoiceNumber: parsed.invoice_number,
        contractRef: parsed.contract_ref,
        amount: parsed.amount,
        issuedDate: parsed.issued_date,
        error: null,
      });
    } catch (err) {
      console.error("parseInvoicePdf failed:", file.name, err);
      results.push({
        fileName: file.name,
        invoiceNumber: null,
        contractRef: null,
        amount: null,
        issuedDate: null,
        error: "Nepodarilo sa prečítať PDF.",
      });
    }
  }

  return results;
}

export type ImportStatus = "ok" | "mismatch" | "not_found" | "already_invoiced" | "ambiguous";

export type CheckedRow = ImportRow & {
  status: ImportStatus;
  orderId: string | null;
  expectedAmount: number | null;
  message: string | null;
  issuedDate: string;
  dueDate: string;
  dateBumped: boolean;
};

function invoiceSortKey(num: string): number {
  const n = parseInt(num.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/**
 * Faktúry musia mať dátum vystavenia v poradí podľa čísla faktúry — vyššie číslo nesmie
 * mať skorší dátum ako nižšie. Ak by Petrov dátum toto porušil, oficiálny dátum vystavenia
 * sa posunie na deň po predchádzajúcej faktúre; splatnosť sa ale vždy počíta z Petrovho
 * pôvodného dátumu (+1 mesiac), nie z posunutého dátumu vystavenia.
 */
function computeIssuedAndDueDates(
  rows: ImportRow[],
  existingInvoices: { invoice_number: string; issued_date: string }[]
) {
  type Anchor = { key: number; issuedDate: string; rowKey: string | null };

  const anchors: Anchor[] = existingInvoices.map((i) => ({
    key: invoiceSortKey(i.invoice_number),
    issuedDate: i.issued_date,
    rowKey: null,
  }));
  const newAnchors: Anchor[] = rows
    .filter((r) => r.invoiceNumber.trim())
    .map((r) => ({ key: invoiceSortKey(r.invoiceNumber), issuedDate: "", rowKey: r.key }));

  const timeline = [...anchors, ...newAnchors].sort((a, b) => a.key - b.key);

  const result = new Map<string, { issuedDate: string; dueDate: string; dateBumped: boolean }>();
  let runningMax: string | null = null;

  for (const item of timeline) {
    if (item.rowKey === null) {
      if (!runningMax || item.issuedDate > runningMax) runningMax = item.issuedDate;
      continue;
    }
    const row = rows.find((r) => r.key === item.rowKey)!;
    const peterDate = row.peterDate;
    let issuedDate = peterDate;
    let dateBumped = false;
    if (runningMax && issuedDate <= runningMax) {
      issuedDate = addDaysISO(runningMax, 1);
      dateBumped = true;
    }
    const dueDate = addMonthsISO(peterDate, 1);
    result.set(row.key, { issuedDate, dueDate, dateBumped });
    if (!runningMax || issuedDate > runningMax) runningMax = issuedDate;
  }

  return result;
}

export async function checkInvoiceImport(rows: ImportRow[]): Promise<CheckedRow[]> {
  const requester = await getProfile();
  if (requester?.role !== "admin") return [];

  const supabase = await createClient();
  const orderNumbers = rows.map((r) => r.orderNumber.trim()).filter(Boolean);

  if (!orderNumbers.length) return [];

  const [{ data: orders }, { data: existingInvoices }] = await Promise.all([
    supabase.from("orders").select("id, order_number, price, work_type, invoices(id)"),
    supabase.from("invoices").select("invoice_number, issued_date"),
  ]);

  const dates = computeIssuedAndDueDates(rows, existingInvoices ?? []);

  return rows.map((row) => {
    const d = dates.get(row.key) ?? {
      issuedDate: row.peterDate,
      dueDate: addMonthsISO(row.peterDate, 1),
      dateBumped: false,
    };
    // "Zmluva č." (napr. "545") sú posledné číslice nemeckého Auftrags-Nr (napr. "202600545") —
    // párujeme cez zhodu konca čísla, nie presnú zhodu, aby stačilo zadať len krátku referenciu.
    const ref = row.orderNumber.trim();
    const matches = (orders ?? []).filter((o) => o.order_number && o.order_number.endsWith(ref));

    if (matches.length === 0) {
      return {
        ...row,
        ...d,
        status: "not_found" as const,
        orderId: null,
        expectedAmount: null,
        message: "Objednávka sa nenašla",
      };
    }

    if (matches.length > 1) {
      return {
        ...row,
        ...d,
        status: "ambiguous" as const,
        orderId: null,
        expectedAmount: null,
        message: `Viacero objednávok končí na "${ref}" — zadaj celé číslo objednávky`,
      };
    }

    const order = matches[0];

    if (order.invoices?.length) {
      return {
        ...row,
        ...d,
        status: "already_invoiced" as const,
        orderId: order.id,
        expectedAmount: null,
        message: "Objednávka už má faktúru",
      };
    }

    const expected =
      order.work_type === "hodiny" || order.price == null ? null : Math.round(order.price * 0.8 * 100) / 100;

    if (expected != null && Math.abs(expected - row.amount) > 0.5) {
      return {
        ...row,
        ...d,
        status: "mismatch" as const,
        orderId: order.id,
        expectedAmount: expected,
        message: `Očakávaná suma ${expected} €`,
      };
    }

    return { ...row, ...d, status: "ok" as const, orderId: order.id, expectedAmount: expected, message: null };
  });
}

export async function commitInvoiceImport(rows: CheckedRow[]) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return { inserted: 0 };

  const supabase = await createClient();
  const toInsert = rows
    .filter((r) => (r.status === "ok" || r.status === "mismatch") && r.orderId)
    .map((r) => ({
      order_id: r.orderId,
      invoice_number: r.invoiceNumber,
      amount: r.amount,
      issued_date: r.issuedDate,
      due_date: r.dueDate,
      created_by: requester.id,
    }));

  if (!toInsert.length) return { inserted: 0 };

  const { error } = await supabase.from("invoices").insert(toInsert);
  if (error) {
    console.error("bulk invoice import failed:", error);
    return { inserted: 0, error: error.message };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/invoices");
  revalidatePath("/admin/orders/prep");
  return { inserted: toInsert.length };
}
