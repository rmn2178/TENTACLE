import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { createHash } from "crypto";

function verifyPassword(password: string, hash: string): boolean {
  const salt = "tentacle-demo-salt";
  const computed = createHash("sha256").update(salt + password).digest("hex");
  return computed === hash;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const trimmedPassword = credentials.password.trim();
        if (!normalizedEmail || !trimmedPassword) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (!user) return null;
        if (!verifyPassword(trimmedPassword, user.passwordHash)) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarHue: user.avatarHue,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.avatarHue = (user as unknown as { avatarHue: number }).avatarHue;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { avatarHue?: number }).avatarHue = token.avatarHue as number;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET ?? "tentacle-dev-secret-change-in-production",
};

// Type augmentation for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      email: string;
      name?: string | null;
      role?: string;
      avatarHue?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    avatarHue?: number;
  }
}
