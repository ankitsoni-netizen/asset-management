"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Boxes, Users, Link2, QrCode, LogOut, CircleUser, LayoutDashboard } from "lucide-react";
import { signOut } from "@/lib/auth-actions";
import { UidLookup } from "./UidLookup";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useProcessing } from "@/components/status/Processing";

const NAV = [
  { href: "/summary", label: "Summary", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Boxes },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/allocations", label: "Allocation", icon: Link2 },
  { href: "/qr", label: "QR codes", icon: QrCode },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const { run } = useProcessing();
  const [accountOpen, setAccountOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function sync() {
      const visualViewport = window.visualViewport;
      if (!visualViewport) return;
      const inset = window.innerHeight - visualViewport.height - visualViewport.offsetTop;
      setKeyboardOpen(inset > 120);
    }

    const viewport = window.visualViewport;
    if (!viewport) return;
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-cf-page">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/10 bg-cf-ink text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <BrandLogo className="h-10 w-auto max-w-[200px]" priority />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Asset desk
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${
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
          <form action={() => run("Signing out", () => signOut())}>
            <button
              type="submit"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="no-print sticky top-0 z-20 border-b border-cf-border bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <BrandLogo variant="color" className="h-8 w-auto max-w-[148px] lg:hidden" priority />
            <div className="hidden min-w-0 flex-1 lg:block">
              <UidLookup />
            </div>
            <button
              type="button"
              className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-cf-border text-cf-text lg:hidden"
              aria-label="Account menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
            >
              <CircleUser className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4 pb-3 sm:px-6 lg:hidden">
            <UidLookup />
          </div>
          {accountOpen ? (
            <div className="border-t border-cf-border px-4 py-4 lg:hidden">
              <p className="truncate text-sm font-medium">{email}</p>
              <form action={() => run("Signing out", () => signOut())}>
                <button
                  type="submit"
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-cf-border text-sm font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </header>

        <main
          className={`px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:pb-8 ${
            keyboardOpen ? "pb-5" : "pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {children}
        </main>
      </div>

      <nav
        className={`no-print fixed inset-x-0 bottom-0 z-30 border-t border-cf-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden ${
          keyboardOpen ? "hidden" : ""
        }`}
      >
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium sm:px-2 sm:text-[11px] ${
                  active ? "text-cf-primary" : "text-cf-muted"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
