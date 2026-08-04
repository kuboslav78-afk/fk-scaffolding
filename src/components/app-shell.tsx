"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions";
import { ScaffoldDecoration } from "@/components/scaffold-decoration";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
      <path d="M3 10l7-6 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9v7a1 1 0 001 1h8a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
      <rect x="3" y="7" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 11h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  employees: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 17c.6-3 2.2-4.5 4.5-4.5s3.9 1.5 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="14.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 12.7c1.8.3 3 1.6 3.5 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  sites: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
      <path d="M10 18s6-5.2 6-9.5A6 6 0 004 8.5C4 12.8 10 18 10 18z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="8.3" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
      <rect x="4.5" y="3.5" width="11" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 3.5h5a1 1 0 011 1V6h-7V4.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 10h6M7 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Nástenka", icon: ICONS.dashboard },
  { href: "/admin", label: "Administrácia", icon: ICONS.admin, adminOnly: true },
  { href: "/admin/employees", label: "Zamestnanci", icon: ICONS.employees, adminOnly: true },
  { href: "/admin/sites", label: "Stavby", icon: ICONS.sites, adminOnly: true },
  { href: "/admin/orders", label: "Objednávky", icon: ICONS.orders, adminOnly: true },
];

function NavLinks({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin").map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              active
                ? "relative flex items-center gap-2.5 rounded-lg bg-brand-500/12 px-3 py-2 text-sm font-medium text-brand-400 transition-colors duration-150 before:absolute before:inset-y-1.5 before:-left-3 before:w-0.5 before:rounded-full before:bg-brand-500 before:shadow-[0_0_8px_1px_rgba(240,162,58,0.6)]"
                : "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900"
            }
          >
            <span className={active ? "text-brand-400 transition-colors duration-150" : "text-ink-500 transition-colors duration-150"}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  fullName,
  role,
  children,
}: {
  fullName: string;
  role: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#0a0908]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_500px_at_60%_-15%,#221f19_0%,transparent_60%)]" />
      <ScaffoldDecoration side="right" />

      {/* Desktop sidebar */}
      <aside className="relative z-10 hidden w-60 shrink-0 flex-col border-r border-ink-100 bg-[#141210] md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-[#241a06] shadow-[0_0_12px_-2px_rgba(240,162,58,0.6)]">
            FK
          </span>
          <span className="font-semibold text-ink-900">FK Scaffolding</span>
        </div>
        <div className="flex-1 px-3">
          <NavLinks role={role} />
        </div>
        <div className="border-t border-ink-100 p-3">
          <div className="mb-2 truncate px-2 text-xs text-ink-500">{fullName}</div>
          <form action={signOut}>
            <button className="btn-ghost w-full justify-start px-2">Odhlásiť sa</button>
          </form>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <div className="flex items-center justify-between border-b border-ink-100 bg-[#141210] px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-[#241a06] shadow-[0_0_12px_-2px_rgba(240,162,58,0.6)]">
              FK
            </span>
            <span className="font-semibold text-ink-900">FK Scaffolding</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Otvoriť menu"
            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-[#141210] p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-ink-900">FK Scaffolding</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Zavrieť menu"
                className="rounded-md p-1 text-ink-500 hover:bg-ink-100"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <NavLinks role={role} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto border-t border-ink-100 pt-3">
              <div className="mb-2 truncate px-2 text-xs text-ink-500">{fullName}</div>
              <form action={signOut}>
                <button className="btn-ghost w-full justify-start px-2">Odhlásiť sa</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
