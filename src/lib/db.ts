// ════════════════════════════════════════════════════════════
//  Cliente Prisma con adapter libsql (bypassa env("DATABASE_URL"))
//  Esto arregla el error URL_INVALID en Vercel serverless
// ════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function parseDatabaseUrl(rawUrl: string): {
  url: string;
  authToken: string | undefined;
} {
  let url = rawUrl;
  let authToken = process.env.TURSO_AUTH_TOKEN;

  if (url.includes("?authToken=") || url.includes("&authToken=")) {
    try {
      const urlObj = new URL(url);
      authToken = urlObj.searchParams.get("authToken") ?? authToken;
      urlObj.searchParams.delete("authToken");
      url = urlObj.toString();
    } catch {
      url = url.replace(/\?authToken=.*$/, "").replace(/&authToken=[^&]*/, "");
    }
  }

  return { url, authToken };
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!databaseUrl) {
    console.warn("[db] DATABASE_URL no configurada, usando SQLite local");
    const libsql = createClient({ url: "file:./db/custom.db" });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter, log: ["error", "warn"] });
  }

  const { url, authToken } = parseDatabaseUrl(databaseUrl);
  const isTurso = url.startsWith("libsql://") || url.startsWith("libsql+ws://");

  console.log(`[db] Conectando a ${isTurso ? "Turso" : "SQLite"}: ${url}`);
  console.log(`[db] authToken: ${authToken ? "***presente***" : "(ninguno)"}`);

  const libsql = createClient({
    url,
    authToken: isTurso ? authToken : undefined,
  });

  const adapter = new PrismaLibSql(libsql);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

let _db: PrismaClient | undefined;
let _initFailed = false;

function getDb(): PrismaClient {
  if (_db) return _db;

  if (_initFailed) {
    throw new Error("Prisma client initialization failed. Check DATABASE_URL.");
  }

  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma;
    return _db;
  }

  try {
    _db = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = _db;
    }
    return _db;
  } catch (e: any) {
    _initFailed = true;
    console.error("[db] Error creando Prisma client:", e.message);
    throw e;
  }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getDb();
    const value = Reflect.get(client, prop);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
}) as PrismaClient;
