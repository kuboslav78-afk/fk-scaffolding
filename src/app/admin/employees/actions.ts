"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";

function generateTempPassword() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function createEmployee(formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return { error: "Nemáš oprávnenie." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const roleInput = formData.get("role");
  const role: "admin" | "foreman" | "employee" =
    roleInput === "admin" || roleInput === "foreman" ? roleInput : "employee";

  if (!fullName || !email) return { error: "Vyplň meno aj email." };

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Vytvorenie účtu zlyhalo." };
  }

  if (role !== "employee") {
    await admin.from("profiles").update({ role }).eq("id", data.user.id);
  }

  revalidatePath("/admin/employees");
  return { tempPassword, email };
}

export async function updateEmployeeRole(formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const employeeId = String(formData.get("employee_id") ?? "");
  const roleInput = formData.get("role");
  const role: "admin" | "foreman" | "employee" =
    roleInput === "admin" || roleInput === "foreman" ? roleInput : "employee";

  if (!employeeId || employeeId === requester.id) return;

  const admin = createAdminClient();
  await admin.from("profiles").update({ role }).eq("id", employeeId);

  revalidatePath("/admin/employees");
}

export async function setEmployeeActive(employeeId: string, active: boolean) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;
  if (requester.id === employeeId) return;

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(employeeId, {
    ban_duration: active ? "none" : "876000h",
  });

  revalidatePath("/admin/employees");
}
