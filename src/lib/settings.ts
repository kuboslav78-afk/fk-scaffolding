import { createClient } from "@/lib/supabase/server";

/** Použije sa, ak nastavenie v DB chýba (napr. ešte nebeží migrácia). */
export const DEFAULT_PAYMENT_TERM_DAYS = 21;

/** Splatnosť faktúr v dňoch od dátumu vystavenia (nastaviteľná v Podklady pre FA). */
export async function getPaymentTermDays(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "payment_term_days")
    .maybeSingle();

  const days = Number(data?.value);
  return Number.isInteger(days) && days > 0 ? days : DEFAULT_PAYMENT_TERM_DAYS;
}
