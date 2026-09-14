import { redirect } from "next/navigation";
import { isAdminEmail } from "./constants";
import { loginRedirectPath } from "./auth-path";
import { createServerSupabaseClient } from "./supabase/server";

export { isAdminEmail };

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  if (!isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    return null;
  }

  return { user, supabase };
}

export async function requireAdminPage(callbackUrl = "/") {
  const admin = await requireAdmin();
  if (admin) return admin;
  redirect(loginRedirectPath(callbackUrl));
}
