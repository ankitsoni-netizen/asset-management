import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ADMIN_EMAIL } from "@/lib/constants";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/login");
  const email = request.auth?.user?.email?.toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;

  if (isLogin) {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/", request.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isAdmin) {
    const loginUrl = new URL("/login", request.nextUrl);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    if (request.auth?.user?.email) {
      loginUrl.searchParams.set("error", "AccessDenied");
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|brand|favicon.ico).*)"],
};
