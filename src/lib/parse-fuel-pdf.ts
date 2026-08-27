import "server-only";
import "./dommatrix-polyfill";
import { PDFParse } from "pdf-parse";
import { toIsoDate, toNumber, extract } from "./pdf-parse-utils";

export type ParsedFuelTransaction = {
  cardNumber: number | null;
  date: string | null;
  product: string;
  place: string;
  docNumber: string;
  netAmount: number | null;
  grossAmount: number | null;
};

export type ParsedFuelStatement = {
  statementDate: string | null;
  transactions: ParsedFuelTransaction[];
};

/**
 * Riadok transakcie má tvar (stĺpce podľa hlavičky výkazu):
 * "17.07.2026 Nafta ARAL,NürnbergLangwasser 11210 DEU 2023059 0 30,89 LTR 19,00 VO EUR 2,3106 59,97 1,28 61,25 72,89 61,25 72,89"
 * Dátum, Produkt (môže mať čiarku, napr. "Super, natural"), Miesto dodania ("Značka,Mesto" — čiarka BEZ medzery),
 * Č. Miesta, sLd (krajina), Číslo dokladu, Km stav, Množstvo, jednotka, DPH%, Druh DPH, EUR, J.cena brutto,
 * a napokon 4-6 súm (posledné 4 sú vždy Spolu netto/brutto v pôvodnej mene a znova v EUR — "Servis netto"
 * stĺpec pred nimi chýba v texte, keď je nulový, preto berieme vždy posledné 4 čísla na riadku, nie pevný počet).
 */
const TX_RE =
  /(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+(\d+)\s+([A-Z]{3})\s+(\S+)\s+(\d+)\s+([\d,]+)\s+(LTR|PCE|KG|HRS|KWH)\s+([\d,]+)\s+(\S+)\s+EUR\s+([\d,]+)\s+([^\n]+)/g;

const CARD_RE = /EČV:\s*KARTA\s*(\d+)/g;

/**
 * "Miesto dodania" má vždy tvar "Značka,Mesto" bez medzery za čiarkou — na rozdiel od Produktu,
 * ktorého prípadná čiarka má za sebou medzeru (napr. "Super, natural"). To umožňuje jednoznačne
 * nájsť hranicu medzi oboma poľami v spojenom texte.
 */
function splitProductPlace(blob: string): { product: string; place: string } {
  const m = blob.match(/^(.*?)\s+(\S+,\S.*)$/);
  if (!m) return { product: blob.trim(), place: "" };
  return { product: m[1].trim(), place: m[2].trim() };
}

export async function parseFuelStatementPdf(buffer: Buffer): Promise<ParsedFuelStatement> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text;

  const cardBoundaries: { index: number; cardNumber: number }[] = [];
  let cm: RegExpExecArray | null;
  CARD_RE.lastIndex = 0;
  while ((cm = CARD_RE.exec(text))) {
    cardBoundaries.push({ index: cm.index, cardNumber: parseInt(cm[1], 10) });
  }
  function cardNumberAt(pos: number): number | null {
    let current: number | null = null;
    for (const b of cardBoundaries) {
      if (b.index <= pos) current = b.cardNumber;
      else break;
    }
    return current;
  }

  const transactions: ParsedFuelTransaction[] = [];
  let m: RegExpExecArray | null;
  TX_RE.lastIndex = 0;
  while ((m = TX_RE.exec(text))) {
    const [, dateRaw, middleBlob, , , docNumber, , , , , , , restOfLine] = m;

    const nums = restOfLine.trim().split(/\s+/).filter((t) => /^[\d,]+$/.test(t));
    if (nums.length < 4) continue;
    const netAmount = toNumber(nums[nums.length - 4]);
    const grossAmount = toNumber(nums[nums.length - 3]);

    const { product, place } = splitProductPlace(middleBlob);

    transactions.push({
      cardNumber: cardNumberAt(m.index),
      date: toIsoDate(dateRaw),
      product,
      place,
      docNumber,
      netAmount,
      grossAmount,
    });
  }

  const statementDateRaw = extract(text, /Dátum vyúčtovania\n[\d\s]+\d+\s+(\d{2}\.\d{2}\.\d{4})/);

  return {
    statementDate: statementDateRaw ? toIsoDate(statementDateRaw) : null,
    transactions,
  };
}
