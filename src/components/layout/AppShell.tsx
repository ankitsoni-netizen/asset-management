import Link from "next/link";
import { LayoutDashboard, Plus, ScrollText, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { UidLookup } from "./UidLookup";
import { BrandLogo } from "@/components/brand/BrandLogo";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/allocate", label: "Allocate asset", icon: Plus },
  { href: "/logs", label: "Allocation log", icon: ScrollText },
];

export function AppShell({
  children,
  email,
  pathname,
}: {
  children: React.ReactNode;
  email: string;
  pathname: string;
}) {
  return (
    <div className="min-h-screen bg-cf-page">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/10 bg-cf-ink text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <BrandLogo className="h-10 w-auto max-w-[200px]" priority />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Asset desk
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active ? "bg-white text-cf-ink" : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-6 py-5">
          <p className="truncate text-sm text-white/80">{email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/50 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-cf-border bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
            <div className="rounded-md bg-black px-2 py-1 lg:hidden">
              <BrandLogo className="h-7 w-auto max-w-[140px]" />
            </div>
            <UidLookup />
            <Link
              href="/allocate"
              className="hidden h-10 items-center rounded-md bg-cf-primary px-4 text-sm font-medium text-white hover:bg-cf-primary-dark sm:inline-flex"
            >
              Allocate
            </Link>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-cf-border px-4 py-2 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  pathname === item.href ? "bg-cf-ink text-white" : "bg-cf-soft text-cf-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
