import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user?.email?.toLowerCase() === ADMIN_EMAIL) {
    redirect("/");
  }

  const params = await searchParams;
  const failed = Boolean(params.error);

  return (
    <div className="min-h-screen bg-cf-ink text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <BrandLogo className="h-12 w-auto max-w-[240px]" priority />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
          Internal asset desk
        </p>
        <h1 className="mt-3 max-w-xl text-4xl font-medium tracking-tight">
          Company asset management
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-white/65">
          Access is restricted to {ADMIN_EMAIL}. Sign in to allocate assets, generate UIDs, and open records from a
          scanned QR code.
        </p>

        <div className="mt-10 max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          {failed ? (
            <p className="mb-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              The email or password is incorrect.
            </p>
          ) : null}
          <form
            className="space-y-4"
            action={async (formData) => {
              "use server";
              const callbackUrl = params.callbackUrl || "/";
              try {
                await signIn("credentials", {
                  email: String(formData.get("email") ?? ""),
                  password: String(formData.get("password") ?? ""),
                  redirectTo: callbackUrl,
                });
              } catch (error) {
                if (error instanceof AuthError) {
                  redirect("/login?error=CredentialsSignin");
                }
                throw error;
              }
            }}
          >
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Email</span>
              <input
                name="email"
                type="email"
                required
                defaultValue={ADMIN_EMAIL}
                autoComplete="username"
                className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Password</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-white text-sm font-medium text-cf-ink hover:bg-white/90"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
