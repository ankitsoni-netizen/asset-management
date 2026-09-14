import { requireAdmin } from "@/lib/auth-helpers";
import { ADMIN_EMAIL } from "@/lib/constants";
import { safeInternalPath } from "@/lib/auth-path";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LoginForm } from "@/components/forms/LoginForm";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.callbackUrl);
  const admin = await requireAdmin();
  if (admin) {
    redirect(nextPath);
  }

  const failed = Boolean(params.error);

  return (
    <div className="min-h-dvh bg-cf-page text-cf-text">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden overflow-hidden bg-cf-ink px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <BrandLogo className="h-10 w-auto max-w-[220px]" priority />
            <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Internal asset desk
            </p>
            <h1 className="mt-4 max-w-md text-4xl font-medium tracking-tight">
              Company asset management
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/70">
              Sign in to manage inventory, the employee roster, and asset–employee mappings on this local desk.
            </p>
          </div>
          <p className="text-xs leading-6 text-white/40">
            Restricted to {ADMIN_EMAIL}. Unauthorised accounts are signed out immediately.
          </p>
        </section>

        <section className="flex items-start justify-center px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] lg:items-center lg:px-6 lg:py-16">
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <BrandLogo variant="color" className="h-10 w-auto max-w-[200px]" priority />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-cf-muted lg:mt-0">
              Admin sign in
            </p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">Welcome back</h2>
            <LoginForm failed={failed} callbackUrl={nextPath} />
          </div>
        </section>
      </div>
    </div>
  );
}
