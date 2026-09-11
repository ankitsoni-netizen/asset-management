import type { NextAuthConfig } from "next-auth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { AUTH_SECRET } from "@/lib/auth-secret";

export const authConfig = {
  secret: AUTH_SECRET,
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      return user.email?.toLowerCase() === ADMIN_EMAIL;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = String(token.email ?? "");
        session.user.name = token.name ? String(token.name) : "Cloutflow Admin";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
