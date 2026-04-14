import NextAuth from "next-auth";
import Strava from "next-auth/providers/strava";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";

// Strava returns providerAccountId as an integer — Prisma expects a string.
// This wrapper coerces it before any DB calls.
function stravaCompatibleAdapter(base: Adapter): Adapter {
  return {
    ...base,
    getUserByAccount: (account) =>
      base.getUserByAccount!({
        ...account,
        providerAccountId: String(account.providerAccountId),
      }),
    linkAccount: (account: AdapterAccount) =>
      base.linkAccount!({
        ...account,
        providerAccountId: String(account.providerAccountId),
      }),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: stravaCompatibleAdapter(PrismaAdapter(prisma) as Adapter),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Strava({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      authorization: {
        params: { scope: "read,activity:read_all" },
      },
      checks: ["state"], // Strava does not support PKCE
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) token.id = user.id;
      if (account?.access_token) {
        token.stravaAccessToken = account.access_token;
        token.stravaRefreshToken = account.refresh_token;
        token.stravaExpiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
