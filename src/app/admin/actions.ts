"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("orders").insert({
    customer_name: formData.get("customer_name"),
    site_name: formData.get("site_name"),
    description: formData.get("description"),
    order_date: formData.get("order_date"),
    created_by: user.id,
  });

  revalidatePath("/admin");
}

export async function addInvoice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("invoices").insert({
    invoice_number: formData.get("invoice_number"),
    customer_name: formData.get("customer_name"),
    amount: formData.get("amount"),
    issued_date: formData.get("issued_date"),
    due_date: formData.get("due_date") || null,
    order_id: formData.get("order_id") || null,
    created_by: user.id,
  });

  revalidatePath("/admin");
}
