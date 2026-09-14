import { NextResponse, type NextRequest } from "next/server";
import { loginRedirectPath } from "@/lib/auth-path";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error("Routing middleware crashed:", error);
    if (request.nextUrl.pathname.startsWith("/login")) {
      return NextResponse.next({ request });
    }
    return NextResponse.redirect(new URL(loginRedirectPath(request.nextUrl.pathname), request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
