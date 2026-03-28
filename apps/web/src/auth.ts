import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail, getUserById, verifyPassword } from "./lib/server/user-service";
import { isAuthorizedRouteRequest } from "./lib/server/auth-route-protection";

const devSecretFallback = "dev-edunexus-secret";
const resolvedSecret = process.env.AUTH_SECRET || (process.env.NODE_ENV !== "production" ? devSecretFallback : undefined);

if (!resolvedSecret) {
  throw new Error("AUTH_SECRET is required when NODE_ENV=production");
}

function isLocalAuthUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

const trustHost =
  process.env.AUTH_TRUST_HOST === "true" ||
  process.env.NODE_ENV !== "production" ||
  isLocalAuthUrl(process.env.AUTH_URL) ||
  isLocalAuthUrl(process.env.NEXTAUTH_URL);

export const authConfig = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "邮箱", type: "text" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await getUserByEmail(email);
        if (!user || !user.password) {
          return null;
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isDemo: user.isDemo,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      return isAuthorizedRouteRequest({ auth, request });
    },
    jwt({ token, user }) {
      if (user && typeof user.id === "string") {
        token.id = user.id;
      } else if (!token.id && typeof token.sub === "string") {
        token.id = token.sub;
      }

      if (user && typeof user.name === "string") {
        token.name = user.name;
      }

      if (user && typeof user.isDemo === "boolean") {
        token.isDemo = user.isDemo;
      } else if (typeof token.isDemo !== "boolean") {
        token.isDemo = false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
        session.user.isDemo = token.isDemo === true;
      }

      if (session.user && typeof token.id === "string") {
        const user = await getUserById(token.id);
        if (user?.name) {
          session.user.name = user.name;
        }
      }

      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: resolvedSecret,
  trustHost,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
