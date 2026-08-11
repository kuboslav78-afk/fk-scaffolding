import "server-only";
import { PDFParse } from "pdf-parse";
import { toIsoDate, toNumber, extract } from "./pdf-parse-utils";

export type ParsedOrder = {
  order_number: string | null;
  customer_name: string | null;
  work_type: "montaz" | "demontaz" | null;
  project_number: string | null;
  site_description: string | null;
  order_date: string | null;
  start_date: string | null;
  handover_date: string | null;
  price: number | null;
};

export async function parseOrderPdf(buffer: Buffer): Promise<ParsedOrder> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text;

  const orderNumber = extract(text, /Auftrags\.?-?Nr\.?:?\s*([0-9]+)/i);
  const workTypeRaw = extract(text, /T[äa]tigkeit:?\s*(Montage|Demontage)/i);
  const projectNumber = extract(text, /Projekt-?Nr\.?:?\s*([0-9]+)/i);
  const bauvorhaben = extract(text, /Bauvorhaben:?\s*([^\n]+)/i);
  const bauteil = extract(text, /Bauteil:?\s*([^\n]+)/i);
  const startDateRaw = extract(
    text,
    /Start\s*bzw\.?\s*Ausf[üu]hrungszeitraum:?\s*([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4})/i
  );
  const handoverDateRaw = extract(
    text,
    /Sp[äa]teste\s*Fertigstellung:?\s*([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4})/i
  );
  const priceRaw = extract(text, /Auftragssumme:?\s*netto\s*([0-9][0-9.,]*)\s*€/i);
  const orderDateMatches = [...text.matchAll(/,\s*den\s+([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4})/gi)];
  const orderDateRaw = orderDateMatches.at(-1)?.[1] ?? null;
  const customerName = extract(text, /zwischen\s*([^,]+),/i);

  return {
    order_number: orderNumber,
    customer_name: customerName,
    work_type: workTypeRaw === "Montage" ? "montaz" : workTypeRaw === "Demontage" ? "demontaz" : null,
    project_number: projectNumber,
    site_description: [bauvorhaben, bauteil].filter(Boolean).join(" — ") || null,
    order_date: orderDateRaw ? toIsoDate(orderDateRaw) : null,
    start_date: startDateRaw ? toIsoDate(startDateRaw) : null,
    handover_date: handoverDateRaw ? toIsoDate(handoverDateRaw) : null,
    price: priceRaw ? toNumber(priceRaw) : null,
  };
}
