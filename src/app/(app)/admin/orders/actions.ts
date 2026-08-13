"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";
import { parseOrderPdf } from "@/lib/parse-order-pdf";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";

async function uploadOrderPdf(orderId: string, pdf: File) {
  const admin = createAdminClient();
  const path = `${orderId}/${Date.now()}-${pdf.name}`;
  const { error: uploadError } = await admin.storage.from("order-pdfs").upload(path, pdf);
  if (uploadError) {
    console.error("order pdf upload failed:", uploadError);
    return;
  }
  await admin.from("orders").update({ pdf_path: path }).eq("id", orderId);
}

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

  const orderDate = String(formData.get("order_date") ?? "");
  const displayMonth = String(formData.get("display_month") ?? "") || orderDate.slice(0, 7);

  const { data: inserted, error: insertError } = await supabase
    .from("orders")
    .insert({
      order_number: formData.get("order_number") || null,
      customer_name: formData.get("customer_name") || null,
      site_id: siteId || null,
      work_type: formData.get("work_type") || null,
      order_date: orderDate,
      display_month: displayMonth,
      start_date: formData.get("start_date") || null,
      handover_date: formData.get("handover_date") || null,
      price: formData.get("price") || null,
      contribution_amount: formData.get("contribution_amount") || null,
      hours: formData.get("hours") || null,
      hourly_rate: formData.get("hourly_rate") || null,
      peter_invoice_issued: formData.get("peter_invoice_issued") === "true",
      peter_invoice_date:
        formData.get("peter_invoice_issued") === "true" ? formData.get("peter_invoice_date") || null : null,
      description: formData.get("description") || null,
      note: formData.get("note") || null,
      created_by: requester.id,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("createOrder insert failed:", insertError);
  }

  const pdf = formData.get("pdf");
  if (inserted && pdf instanceof File && pdf.size > 0) {
    await uploadOrderPdf(inserted.id, pdf);
  }

  revalidatePath("/admin/orders");
  redirect(displayMonth ? `/admin/orders?month=${displayMonth}` : "/admin/orders");
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
  revalidatePath("/admin/orders/invoices");
  redirect("/admin/orders/invoices");
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
  revalidatePath("/admin/orders/invoices");
}

export async function sendInvoiceToPeter(invoiceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const requester = await getProfile();
  if (requester?.role !== "admin") return { ok: false, error: "Nemáš oprávnenie." };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, issued_date, due_date, pdf_path, orders(order_number, customer_name)")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { ok: false, error: "Faktúra sa nenašla." };
  if (!invoice.pdf_path) return { ok: false, error: "K tejto faktúre nie je archivované PDF (bola pridaná ručne)." };

  const { data: contacts } = await supabase.from("email_contacts").select("name, email");
  const peter = contacts?.find((c) => c.name.toLowerCase().includes("peter"));
  if (!peter) return { ok: false, error: 'Nie je nastavený kontakt "Peter" (Podklady pre FA → Kontakty).' };

  const resend = getResendClient();
  if (!resend) return { ok: false, error: "RESEND_API_KEY nie je nastavený." };

  const admin = createAdminClient();
  const { data: fileData, error: downloadError } = await admin.storage.from("invoice-pdfs").download(invoice.pdf_path);
  if (downloadError || !fileData) return { ok: false, error: "PDF sa nepodarilo stiahnuť zo storage." };

  const buffer = Buffer.from(await fileData.arrayBuffer());
  // @ts-expect-error supabase join shape
  const orderLabel = `${invoice.orders?.order_number ?? "—"} · ${invoice.orders?.customer_name ?? "—"}`;

  const { error: sendError } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: peter.email,
    subject: `Faktúra ${invoice.invoice_number}`,
    text: [
      `Faktúra č. ${invoice.invoice_number}`,
      `Objednávka: ${orderLabel}`,
      `Suma: ${invoice.amount} €`,
      `Vystavená: ${invoice.issued_date}`,
      invoice.due_date ? `Splatnosť: ${invoice.due_date}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    attachments: [{ filename: `Faktura_${invoice.invoice_number}.pdf`, content: buffer }],
  });

  if (sendError) return { ok: false, error: sendError.message };

  await supabase.from("invoices").update({ sent: true }).eq("id", invoiceId);
  revalidatePath("/admin/orders/invoices");
  return { ok: true };
}

export async function markPeterInvoiceIssued(orderId: string, date: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ peter_invoice_issued: true, peter_invoice_date: date })
    .eq("id", orderId);

  revalidatePath("/admin/orders");
}

export async function unmarkPeterInvoiceIssued(orderId: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ peter_invoice_issued: false, peter_invoice_date: null })
    .eq("id", orderId);

  revalidatePath("/admin/orders");
}

export async function updateInvoice(id: string, formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase
    .from("invoices")
    .update({
      invoice_number: formData.get("invoice_number"),
      amount: formData.get("amount"),
      issued_date: formData.get("issued_date"),
      due_date: formData.get("due_date") || null,
    })
    .eq("id", id);

  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/invoices");
}

export async function deleteInvoice(id: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("invoices").delete().eq("id", id);

  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/invoices");
}

export async function deleteOrder(orderId: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("orders").delete().eq("id", orderId);

  revalidatePath("/admin/orders");
}

export async function updateOrder(orderId: string, formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();

  const orderDate = String(formData.get("order_date") ?? "");
  const displayMonth = String(formData.get("display_month") ?? "") || orderDate.slice(0, 7);

  await supabase
    .from("orders")
    .update({
      order_number: formData.get("order_number") || null,
      customer_name: formData.get("customer_name") || null,
      site_id: formData.get("site_id") || null,
      work_type: formData.get("work_type") || null,
      order_date: orderDate,
      display_month: displayMonth,
      start_date: formData.get("start_date") || null,
      handover_date: formData.get("handover_date") || null,
      price: formData.get("price") || null,
      contribution_amount: formData.get("contribution_amount") || null,
      hours: formData.get("hours") || null,
      hourly_rate: formData.get("hourly_rate") || null,
      description: formData.get("description") || null,
      note: formData.get("note") || null,
    })
    .eq("id", orderId);

  const pdf = formData.get("pdf");
  if (pdf instanceof File && pdf.size > 0) {
    await uploadOrderPdf(orderId, pdf);
  }

  revalidatePath("/admin/orders");
}
