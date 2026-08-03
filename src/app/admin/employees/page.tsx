import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";
import { NavBar } from "@/components/nav-bar";
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
    <div className="min-h-screen bg-neutral-50">
      <NavBar fullName={profile.full_name} role={profile.role} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">Zamestnanci</h1>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Nový zamestnanec</h2>
            <CreateEmployeeForm />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Existujúci účty</h2>
            <ul className="divide-y divide-neutral-100 text-sm">
              {employees.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">{e.full_name}</p>
                    <p className="truncate text-neutral-500">{e.email}</p>
                    {!e.active && <p className="text-xs text-red-600">deaktivovaný</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RoleSelectForm
                      employeeId={e.id}
                      role={e.role}
                      disabled={e.id === profile.id}
                    />
                    <form action={setEmployeeActive.bind(null, e.id, !e.active)}>
                      <button
                        type="submit"
                        disabled={e.id === profile.id}
                        className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                      >
                        {e.active ? "Deaktivovať" : "Aktivovať"}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
              {!employees.length && (
                <li className="py-2 text-neutral-400">Zatiaľ žiadni zamestnanci.</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
