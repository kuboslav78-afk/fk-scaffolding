"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { parseOrderPdf } from "@/lib/parse-order-pdf";

export async function parseOrderPdfAction(formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return { error: "Nemáš oprávnenie." };

  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Vyber PDF súbor." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseOrderPdf(buffer);
    return { parsed };
  } catch (err) {
    console.error("parseOrderPdf failed:", err);
    return { error: "PDF sa nepodarilo prečítať." };
  }
}

export async function createOrder(formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();

  let siteId = String(formData.get("site_id") ?? "");
  const newSiteName = String(formData.get("new_site_name") ?? "").trim();

  if (!siteId && newSiteName) {
    const { data: newSite } = await supabase
      .from("sites")
      .insert({
        name: newSiteName,
        project_number: formData.get("project_number") || null,
      })
      .select("id")
      .single();
    siteId = newSite?.id ?? "";
  }

  await supabase.from("orders").insert({
    order_number: formData.get("order_number") || null,
    customer_name: formData.get("customer_name") || null,
    site_id: siteId || null,
    work_type: formData.get("work_type") || null,
    order_date: formData.get("order_date"),
    start_date: formData.get("start_date") || null,
    handover_date: formData.get("handover_date") || null,
    price: formData.get("price") || null,
    contribution_amount: formData.get("contribution_amount") || null,
    hours: formData.get("hours") || null,
    hourly_rate: formData.get("hourly_rate") || null,
    peter_invoice_issued: formData.get("peter_invoice_issued") === "true",
    description: formData.get("description") || null,
    note: formData.get("note") || null,
    created_by: requester.id,
  });

  revalidatePath("/admin/orders");
}

export async function createInvoice(formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();

  await supabase.from("invoices").insert({
    order_id: formData.get("order_id"),
    invoice_number: formData.get("invoice_number"),
    amount: formData.get("amount"),
    issued_date: formData.get("issued_date"),
    due_date: formData.get("due_date") || null,
    created_by: requester.id,
  });

  revalidatePath("/admin/orders");
}

export async function toggleInvoiceFlag(id: string, field: "sent" | "paid", value: boolean) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase
    .from("invoices")
    .update({ [field]: value })
    .eq("id", id);

  revalidatePath("/admin/orders");
}

export async function togglePeterInvoiceIssued(orderId: string, value: boolean) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("orders").update({ peter_invoice_issued: value }).eq("id", orderId);

  revalidatePath("/admin/orders");
}
