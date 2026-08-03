import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";
import { CreateEmployeeForm } from "@/components/create-employee-form";
import { RoleSelectForm } from "@/components/role-select-form";
import { setEmployeeActive } from "./actions";

export default async function EmployeesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authUsers }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const employees = (profiles ?? []).map((p) => {
    const authUser = authUsers?.users.find((u) => u.id === p.id);
    return {
      ...p,
      email: authUser?.email ?? "—",
      active: !authUser?.banned_until || new Date(authUser.banned_until) < new Date(),
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Zamestnanci</h1>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Nový zamestnanec</h2>
          <CreateEmployeeForm />
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Existujúci účty</h2>
          <ul className="divide-y divide-ink-100 text-sm">
            {employees.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{e.full_name}</p>
                  <p className="truncate text-ink-500">{e.email}</p>
                  {!e.active && <p className="badge-danger mt-1">deaktivovaný</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RoleSelectForm employeeId={e.id} role={e.role} disabled={e.id === profile.id} />
                  <form action={setEmployeeActive.bind(null, e.id, !e.active)}>
                    <button
                      type="submit"
                      disabled={e.id === profile.id}
                      className="btn-secondary btn-sm"
                    >
                      {e.active ? "Deaktivovať" : "Aktivovať"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {!employees.length && <li className="py-2 text-ink-400">Zatiaľ žiadni zamestnanci.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
