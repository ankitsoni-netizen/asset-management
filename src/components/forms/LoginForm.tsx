"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ADMIN_EMAIL, isAdminEmail } from "@/lib/constants";
import { safeInternalPath } from "@/lib/auth-path";
import { PasswordField } from "@/components/forms/PasswordField";
import { useProcessing } from "@/components/status/Processing";

export function LoginForm({
  failed,
  callbackUrl,
}: {
  failed: boolean;
  callbackUrl: string;
}) {
  const router = useRouter();
  const { run, startNavigation } = useProcessing();
  const [submitting, setSubmitting] = useState(false);
  const [errorVisible, setErrorVisible] = useState(failed);
  const nextPath = safeInternalPath(callbackUrl);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorVisible(false);
    const form = event.currentTarget;

    try {
      await run("Signing in", async () => {
        const formData = new FormData(form);
        const email = String(formData.get("email") ?? "")
          .trim()
          .toLowerCase();
        const password = String(formData.get("password") ?? "");

        if (!isAdminEmail(email)) {
          throw new Error("unauthorised");
        }

        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error || !data.user || !isAdminEmail(data.user.email)) {
          if (data.user) {
            await supabase.auth.signOut();
          }
          throw new Error("unauthorised");
        }

        startNavigation("Opening asset desk");
        router.push(nextPath);
        router.refresh();
      });
    } catch {
      setErrorVisible(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-cf-border bg-white p-5 shadow-[0_12px_40px_rgba(10,13,20,0.06)] sm:mt-10 sm:p-8">
      {errorVisible ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          The email or password is incorrect, or this account is not authorised.
        </p>
      ) : null}
      <form className="space-y-5" onSubmit={onSubmit} autoComplete="on">
        <label className="block">
          <span className="cf-label">Admin email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={ADMIN_EMAIL}
            autoComplete="username"
            spellCheck={false}
            className="mt-2 h-12 w-full rounded-md border border-cf-border bg-white px-3 text-cf-text"
          />
        </label>
        <PasswordField />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-cf-primary text-sm font-medium text-white hover:bg-cf-primary-dark disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs leading-5 text-cf-muted">
        Access is limited to {ADMIN_EMAIL}. There is no public registration.
      </p>
    </div>
  );
}
