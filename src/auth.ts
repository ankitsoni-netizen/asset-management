import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ADMIN_EMAIL } from "@/lib/constants";
import { passwordsMatch } from "@/lib/password";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin@cloutflow.123123";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");

        if (email !== ADMIN_EMAIL || !passwordsMatch(password, ADMIN_PASSWORD)) {
          return null;
        }

        return {
          id: ADMIN_EMAIL,
          email: ADMIN_EMAIL,
          name: "Cloutflow Admin",
        };
      },
    }),
  ],
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
});
