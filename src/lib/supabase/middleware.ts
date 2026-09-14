import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { isAdminEmail } from "@/lib/constants";
import { loginRedirectPath, safeInternalPath } from "@/lib/auth-path";
import { readSupabaseEnv } from "./env";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    if (!to.headers.has(key)) {
      to.headers.set(key, value);
    }
  });
  return to;
}

function unauthenticatedResponse(
  request: NextRequest,
  supabaseResponse: NextResponse,
  deniedExistingSession = false,
) {
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname.startsWith("/login");
  const isApi = pathname.startsWith("/api/");

  if (isLogin) {
    return supabaseResponse;
  }

  if (isApi) {
    const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return copyCookies(supabaseResponse, unauthorized);
  }

  const loginUrl = new URL(loginRedirectPath(`${pathname}${search}`), request.url);
  if (deniedExistingSession) {
    loginUrl.searchParams.set("error", "AccessDenied");
  }
  return copyCookies(supabaseResponse, NextResponse.redirect(loginUrl));
}

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = readSupabaseEnv();

  if (!url || !anonKey) {
    console.error("Supabase environment variables are missing in middleware.");
    return unauthenticatedResponse(request, supabaseResponse);
  }

  try {
    return await refreshSession(request, url, anonKey);
  } catch (error) {
    console.error("Middleware session update failed:", error);
    return unauthenticatedResponse(request, NextResponse.next({ request }));
  }
}

async function refreshSession(request: NextRequest, url: string, anonKey: string) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let deniedExistingSession = false;
  if (user && !isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    deniedExistingSession = true;
  }

  const isAdmin = Boolean(user && isAdminEmail(user.email) && !deniedExistingSession);
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");

  if (isLogin) {
    if (isAdmin) {
      const redirectResponse = NextResponse.redirect(new URL(safeInternalPath(callbackUrl), request.url));
      return copyCookies(supabaseResponse, redirectResponse);
    }
    return supabaseResponse;
  }

  if (!isAdmin) {
    return unauthenticatedResponse(request, supabaseResponse, deniedExistingSession);
  }

  return supabaseResponse;
}
