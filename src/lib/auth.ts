// UMPI - NextAuth Configuration (AUTOCONTENIDO - no necesita Prisma ni db-raw)
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createClient, type Client } from "@libsql/client";

let _client: Client | undefined;

function getDbClient(): Client {
  if (_client) return _client;
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl || databaseUrl === "undefined") {
    _client = createClient({ url: "file:./db/custom.db" });
    return _client;
  }
  let url = databaseUrl;
  let authToken = process.env.TURSO_AUTH_TOKEN;
  if (url.includes("authToken=")) {
    try {
      const u = new URL(url);
      authToken = u.searchParams.get("authToken") ?? authToken;
      u.searchParams.delete("authToken");
      url = u.toString();
    } catch {
      url = url.replace(/\?authToken=.*$/, "").replace(/&authToken=[^&]*/, "");
    }
  }
  const isTurso = url.startsWith("libsql://") || url.startsWith("libsql+ws://");
  _client = createClient({ url, authToken: isTurso ? authToken : undefined });
  return _client;
}

async function findUserByEmail(email: string) {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, email, name, lastName, passwordHash, image, role, plan, banned, verified FROM User WHERE email = ? LIMIT 1`,
    args: [email.toLowerCase().trim()],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: String(r.id), email: String(r.email),
    name: r.name === null ? null : String(r.name),
    lastName: r.lastName === null ? null : String(r.lastName),
    passwordHash: r.passwordHash === null ? null : String(r.passwordHash),
    image: r.image === null ? null : String(r.image),
    role: String(r.role), plan: String(r.plan),
    banned: Boolean(r.banned), verified: Boolean(r.verified),
  };
}

async function findUserById(id: string) {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT plan, role, banned FROM User WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return { plan: String(r.plan), role: String(r.role), banned: Boolean(r.banned) };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "UMPI",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await findUserByEmail(credentials.email);
          if (!user || !user.passwordHash || user.banned) return null;
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;
          return {
            id: user.id, email: user.email,
            name: [user.name, user.lastName].filter(Boolean).join(" ") || null,
            image: user.image || null, role: user.role, plan: user.plan,
          } as any;
        } catch (e: any) {
          console.error("[auth] authorize error:", e.message);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/?auth=login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role || "user";
        token.plan = (user as any).plan || "basico";
      }
      if (token.id) {
        try {
          const dbUser = await findUserById(token.id as string);
          if (dbUser) {
            token.plan = dbUser.plan;
            token.role = dbUser.role;
            if (dbUser.banned) return {} as any;
          } else {
            return {} as any;
          }
        } catch (e: any) {
          console.error("[auth] jwt refresh error:", e.message);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).plan = token.plan;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string; email: string; name?: string | null;
      image?: string | null; role: string; plan: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string; role?: string; plan?: string; planRefreshed?: boolean;
  }
}
