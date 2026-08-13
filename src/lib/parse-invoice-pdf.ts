import "server-only";
import "./dommatrix-polyfill";
import { PDFParse } from "pdf-parse";
import { toIsoDate, toNumber, extract } from "./pdf-parse-utils";

export type ParsedInvoice = {
  invoice_number: string | null;
  /** Posledné 3 číslice nemeckého Auftrags-Nr. (napr. "545"), z položky "Z-545" na faktúre. */
  contract_ref: string | null;
  amount: number | null;
  issued_date: string | null;
  due_date: string | null;
};

export async function parseInvoicePdf(buffer: Buffer): Promise<ParsedInvoice> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text;

  const invoiceNumber = extract(text, /FAKTÚRA č\.\s*(\S+)/i);
  const contractRef = extract(text, /Z-(\d+)/);
  const amountRaw = extract(text, /SPOLU NA ÚHRADU\s+([0-9][0-9\s]*,\d{2})/i);
  const issuedDateRaw = extract(text, /(\d{1,2}\.\d{1,2}\.\d{4})\s*\t?Dátum vyhotovenia:/i);
  const dueDateRaw = extract(text, /Banka:\s*\n?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);

  return {
    invoice_number: invoiceNumber,
    contract_ref: contractRef,
    amount: amountRaw ? toNumber(amountRaw) : null,
    issued_date: issuedDateRaw ? toIsoDate(issuedDateRaw) : null,
    due_date: dueDateRaw ? toIsoDate(dueDateRaw) : null,
  };
}
