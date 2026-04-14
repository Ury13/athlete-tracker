import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Prisma, no Node.js modules
// Used by middleware for JWT verification only
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname === "/api/seed";

      if (isPublic) return true;
      if (isLoggedIn) return true;
      return false;
    },
  },
};
