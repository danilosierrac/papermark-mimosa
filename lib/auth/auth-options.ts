import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";

import { identifyUser, trackAnalytics } from "@/lib/analytics";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

function getMainDomainUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXTAUTH_URL || "http://localhost:3000";
  }
  return process.env.NEXTAUTH_URL || "https://app.papermark.com";
}

function isAllowedLoginEmail(email: string): boolean {
  const allowedDomains = (process.env.ALLOWED_LOGIN_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const allowedEmails = (process.env.ALLOWED_LOGIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowedDomains.length === 0 && allowedEmails.length === 0) {
    return true;
  }

  const domain = email.split("@")[1];
  return allowedEmails.includes(email) || allowedDomains.includes(domain);
}

export const authOptions: NextAuthOptions = {
  pages: {
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID as string,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
      authorization: {
        params: { scope: "openid profile email" },
      },
      issuer: "https://www.linkedin.com/oauth",
      jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
      profile(profile, tokens) {
        const defaultImage =
          "https://cdn-icons-png.flaticon.com/512/174/174857.png";
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture ?? defaultImage,
        };
      },
      allowDangerousEmailAccountLinking: true,
    }),
    // Stopgap for this internal-only deployment: no real Resend/Google/LinkedIn
    // OAuth apps have credentials set up yet, so this is the only path that
    // needs no third-party account. Gated by the same email allowlist as
    // every other provider, plus a shared password. Remove once Google or
    // LinkedIn OAuth is properly configured.
    CredentialsProvider({
      id: "internal-password",
      name: "Internal password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        const sharedPassword = process.env.INTERNAL_LOGIN_PASSWORD;

        if (!email || !password || !sharedPassword) return null;
        if (password !== sharedPassword) return null;
        if (!isAllowedLoginEmail(email)) return null;

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // No `domain` override: this fork runs on *.vercel.app, not
        // papermark.com — a hardcoded domain here made the browser silently
        // reject the session cookie on every login (Google, LinkedIn, and
        // the internal-password fallback all "succeeded" server-side but
        // never actually created a session, bouncing back to /login).
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  callbacks: {
    signIn: async ({ user }) => {
      const email = user?.email?.toLowerCase();
      if (!email) return false;

      // Internal-only demo: restrict who can ever create a session, across
      // every provider. Empty env var means unrestricted (local dev default).
      return isAllowedLoginEmail(email);
    },
    jwt: async (params) => {
      const { token, user, trigger, account } = params;
      if (!token.email) {
        return {};
      }
      if (user) {
        token.user = user;
      }
      if (trigger === "update") {
        const user = token?.user as CustomUser;
        const refreshedUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        if (refreshedUser) {
          token.user = refreshedUser;
        } else {
          return {};
        }

        if (refreshedUser?.email !== user.email) {
          if (user.id && refreshedUser.email) {
            await prisma.account.deleteMany({
              where: { userId: user.id },
            });
          }
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      (session.user as CustomUser) = {
        id: token.sub,
        // @ts-ignore
        ...(token || session).user,
      };
      return session;
    },
  },
  events: {
    async createUser(message) {
      await identifyUser(message.user.email ?? message.user.id);
      await trackAnalytics({
        event: "User Signed Up",
        email: message.user.email,
        userId: message.user.id,
      });

      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_BASE_URL ?? getMainDomainUrl()}/api/cron/welcome-user`,
        body: {
          userId: message.user.id,
        },
        delay: 15 * 60,
      });
    },
  },
};
