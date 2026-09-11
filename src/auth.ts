import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { ADMIN_EMAIL } from "@/lib/constants";
import { passwordsMatch } from "@/lib/password";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || "admin@cloutflow.123123";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
});
