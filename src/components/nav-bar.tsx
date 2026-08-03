import Link from "next/link";
import { signOut } from "@/app/actions";

export function NavBar({
  fullName,
  role,
}: {
  fullName: string;
  role: "admin" | "employee";
}) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-neutral-900">KS Scaffolding</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
              Nástenka
            </Link>
            {role === "admin" && (
              <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
                Administrácia
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">{fullName}</span>
          <form action={signOut}>
            <button className="text-neutral-500 hover:text-neutral-900">Odhlásiť sa</button>
          </form>
        </div>
      </div>
    </header>
  );
}
