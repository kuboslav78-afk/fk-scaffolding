"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";
import { addDaysISO, addMonthsISO } from "@/lib/dates";
import { parseInvoicePdf } from "@/lib/parse-invoice-pdf";

export type ImportRow = {
  key: string;
  orderNumber: string;
  invoiceNumber: string;
  amount: number;
  peterDate: string;
  pdfPath: string | null;
  /** Skutočný dátum splatnosti vytlačený na faktúre — ak je, použije sa namiesto dopočítaného +1 mesiac. */
  pdfDueDate: string | null;
};

export type ParsedInvoiceRow = {
  fileName: string;
  invoiceNumber: string | null;
  contractRef: string | null;
  siteLabel: string | null;
  amount: number | null;
  issuedDate: string | null;
  dueDate: string | null;
  pdfPath: string | null;
  error: string | null;
};

export async function parseInvoicePdfsAction(formData: FormData): Promise<ParsedInvoiceRow[]> {
  const requester = await getProfile();
  if (requester?.role !== "admin") return [];

  const files = formData.getAll("pdfs").filter((f): f is File => f instanceof File);
  const results: ParsedInvoiceRow[] = [];
  const admin = createAdminClient();

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parseInvoicePdf(buffer);

      const safeName = file.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${Date.now()}-${safeName}`;
      const { error: uploadError } = await admin.storage.from("invoice-pdfs").upload(path, buffer, {
        contentType: "application/pdf",
      });
      if (uploadError) console.error("invoice pdf upload failed:", file.name, uploadError);

      const resolvedPath = uploadError ? null : path;
      if (parsed.items.length) {
        for (const item of parsed.items) {
          results.push({
            fileName: file.name,
            invoiceNumber: parsed.invoice_number,
            contractRef: item.contract_ref,
            siteLabel: item.site_label,
            amount: item.amount,
            issuedDate: parsed.issued_date,
            dueDate: parsed.due_date,
            pdfPath: resolvedPath,
            error: null,
          });
        }
      } else {
        results.push({
          fileName: file.name,
          invoiceNumber: parsed.invoice_number,
          contractRef: null,
          siteLabel: null,
          amount: null,
          issuedDate: parsed.issued_date,
          dueDate: parsed.due_date,
          pdfPath: resolvedPath,
          error: null,
        });
      }
    } catch (err) {
      console.error("parseInvoicePdf failed:", file.name, err);
      results.push({
        fileName: file.name,
        invoiceNumber: null,
        contractRef: null,
        siteLabel: null,
        amount: null,
        issuedDate: null,
        dueDate: null,
        pdfPath: null,
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
  type Anchor = { key: number; issuedDate: string; invoiceNumber: string | null };

  // viac riadkov môže patriť tej istej faktúre (jedna faktúra na viac objednávok) - v časovej osi
  // ich rátame len raz, aby sa navzájom nebumpovali, a výsledný dátum potom priradíme všetkým.
  const uniqueByInvoiceNumber = new Map<string, ImportRow>();
  for (const r of rows) {
    const num = r.invoiceNumber.trim();
    if (num && !uniqueByInvoiceNumber.has(num)) uniqueByInvoiceNumber.set(num, r);
  }

  const anchors: Anchor[] = existingInvoices.map((i) => ({
    key: invoiceSortKey(i.invoice_number),
    issuedDate: i.issued_date,
    invoiceNumber: null,
  }));
  const newAnchors: Anchor[] = [...uniqueByInvoiceNumber.entries()].map(([num, r]) => ({
    key: invoiceSortKey(num),
    issuedDate: "",
    invoiceNumber: r.invoiceNumber.trim(),
  }));

  const timeline = [...anchors, ...newAnchors].sort((a, b) => a.key - b.key);

  const byInvoiceNumber = new Map<string, { issuedDate: string; dueDate: string; dateBumped: boolean }>();
  let runningMax: string | null = null;

  for (const item of timeline) {
    if (item.invoiceNumber === null) {
      if (!runningMax || item.issuedDate > runningMax) runningMax = item.issuedDate;
      continue;
    }
    const row = uniqueByInvoiceNumber.get(item.invoiceNumber)!;
    const peterDate = row.peterDate;
    let issuedDate = peterDate;
    let dateBumped = false;
    if (runningMax && issuedDate <= runningMax) {
      issuedDate = addDaysISO(runningMax, 1);
      dateBumped = true;
    }
    // Ak vieme skutočný dátum splatnosti priamo z PDF, dôverujeme mu namiesto odhadu +1 mesiac
    // (POHODA ho niekedy počíta inak, napr. 23 dní namiesto celého mesiaca).
    const dueDate = row.pdfDueDate ?? addMonthsISO(peterDate, 1);
    byInvoiceNumber.set(item.invoiceNumber, { issuedDate, dueDate, dateBumped });
    if (!runningMax || issuedDate > runningMax) runningMax = issuedDate;
  }

  const result = new Map<string, { issuedDate: string; dueDate: string; dateBumped: boolean }>();
  for (const row of rows) {
    const num = row.invoiceNumber.trim();
    const computed = num ? byInvoiceNumber.get(num) : undefined;
    if (computed) result.set(row.key, computed);
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
    supabase.from("orders").select("id, order_number, price, work_type, sites(name, short_name)"),
    supabase.from("invoices").select("invoice_number, issued_date, order_id"),
  ]);

  // jedna faktúra môže patriť viacerým objednávkam - duplicita je až dvojica (číslo faktúry + objednávka)
  const existingInvoiceOrderPairs = new Set(
    (existingInvoices ?? []).map((i) => `${i.invoice_number}::${i.order_id}`)
  );
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
    let matches = (orders ?? []).filter((o) => o.order_number && o.order_number.endsWith(ref));

    // Hodinovka nemá číslo objednávky (Peter jej nedáva Auftrags-Nr) — ak sa nenašlo nič cez
    // číslo, skús napárovať podľa názvu stavby (presne to, čo z PDF vytiahne parser aj to,
    // čo sa predvyplní do "Zmluva č." pre riadky bez Z-XXX referencie).
    if (matches.length === 0) {
      const refLower = ref.toLowerCase();
      matches = (orders ?? []).filter((o) => {
        if (o.order_number) return false;
        // @ts-expect-error supabase join shape
        const siteName = (o.sites?.short_name || o.sites?.name || "").toLowerCase();
        return !!siteName && siteName === refLower;
      });
    }

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

    if (row.invoiceNumber.trim() && existingInvoiceOrderPairs.has(`${row.invoiceNumber.trim()}::${order.id}`)) {
      return {
        ...row,
        ...d,
        status: "already_invoiced" as const,
        orderId: order.id,
        expectedAmount: null,
        message: "Táto faktúra už bola pre túto objednávku importovaná",
      };
    }

    // jedna objednávka môže mať viac faktúr a jedna faktúra viac objednávok — nekontrolujeme,
    // či objednávka už nejakú faktúru má, len či presne táto dvojica faktúra+objednávka nie je duplicitná
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
      pdf_path: r.pdfPath,
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
