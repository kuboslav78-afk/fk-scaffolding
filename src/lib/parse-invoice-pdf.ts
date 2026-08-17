import "server-only";
import "./dommatrix-polyfill";
import { PDFParse } from "pdf-parse";
import { toIsoDate, toNumber, extract } from "./pdf-parse-utils";

export type ParsedInvoiceItem = {
  /** Posledné 3 číslice nemeckého Auftrags-Nr. (napr. "545"), z položky "Z-545" na faktúre. */
  contract_ref: string;
  amount: number;
};

export type ParsedInvoice = {
  invoice_number: string | null;
  /** Jedna faktúra môže obsahovať viac objednávok naraz (jeden riadok "Z-XXX" na objednávku). */
  items: ParsedInvoiceItem[];
  issued_date: string | null;
  due_date: string | null;
};

/**
 * Riadky položiek majú tvar "Z-573 0% 0,00 4 739,63 4 739,63 4 739,63 1" - referencia,
 * sadzba DPH, DPH suma a potom cena/EUR/celkom (rovnaká hodnota trikrát) + množstvo.
 * Zoberieme prvú sumu po DPH sume, tá zodpovedá riadkovej cene "Celkom".
 */
const LINE_ITEM_RE = /Z-(\d+)\s+\d+%\s+[0-9][0-9\s]*,\d{2}\s+([0-9][0-9\s]*,\d{2})/g;

export async function parseInvoicePdf(buffer: Buffer): Promise<ParsedInvoice> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text;

  const invoiceNumber = extract(text, /FAKTÚRA č\.\s*(\S+)/i);
  const issuedDateRaw = extract(text, /(\d{1,2}\.\d{1,2}\.\d{4})\s*\t?Dátum vyhotovenia:/i);
  const dueDateRaw = extract(text, /Banka:\s*\n?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);

  const items: ParsedInvoiceItem[] = [];
  for (const m of text.matchAll(LINE_ITEM_RE)) {
    const amount = toNumber(m[2]);
    if (amount != null) items.push({ contract_ref: m[1], amount });
  }

  return {
    invoice_number: invoiceNumber,
    items,
    issued_date: issuedDateRaw ? toIsoDate(issuedDateRaw) : null,
    due_date: dueDateRaw ? toIsoDate(dueDateRaw) : null,
  };
}
