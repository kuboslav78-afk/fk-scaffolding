export type InvoiceAmountInput = {
  work_type: string | null;
  price: number | null;
  hours?: number | null;
  hourly_rate?: number | null;
  full_invoice?: boolean | null;
};

/** Hodinovka sa fakturuje vždy naplno (hours × rate), ostatné typy len 80% ceny, kým nie je full_invoice. */
export function computeInvoiceAmount(order: InvoiceAmountInput): number | null {
  if (order.work_type === "hodiny") {
    return order.hours != null && order.hourly_rate != null ? order.hours * order.hourly_rate : order.price;
  }
  if (order.price == null) return null;
  return order.full_invoice ? order.price : order.price * 0.8;
}
