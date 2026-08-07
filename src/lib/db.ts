// ════════════════════════════════════════════════════════════
//  Cliente Prisma con soporte para Turso (libSQL) y SQLite local
// ════════════════════════════════════════════════════════════
//  - Si DATABASE_URL empieza con "libsql://" → usa Turso (producción)
//  - Si empieza con "file:" → usa SQLite local (desarrollo)
//  - SIEMPRE usa el adapter @prisma/adapter-libsql para que Prisma
//    NO dependa de env("DATABASE_URL") del schema.prisma
//  - LAZY INIT: el cliente se crea solo cuando se usa por primera vez,
//    no cuando se importa el módulo. Esto resuelve el error
//    "URL_INVALID: The URL 'undefined'" en Vercel serverless.

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

  // Si la URL tiene ?authToken=, extraerlo
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

  // Fallback: si DATABASE_URL no está disponible, usar SQLite local
  if (!databaseUrl) {
    console.warn("[db] ⚠️ DATABASE_URL no configurada, usando SQLite local por defecto");
    const libsql = createClient({ url: "file:./db/custom.db" });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });
  }

  const { url, authToken } = parseDatabaseUrl(databaseUrl);

  // ─── SIEMPRE usar el adapter (tanto para Turso como para SQLite local) ───
  const isTurso = url.startsWith("libsql://") || url.startsWith("libsql+ws://");
  console.log(`[db] Conectando a ${isTurso ? "Turso (libSQL remoto)" : "SQLite local"}`);
  if (isTurso) {
    console.log(`[db] URL: ${url}`);
    console.log(`[db] Auth token: ${authToken ? "***presente***" : "(ninguno)"}`);
  }

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

// ─── LAZY INIT: crear el cliente solo cuando se use por primera vez ───
let _db: PrismaClient | undefined;
let _initFailed = false;

function getDb(): PrismaClient {
  if (_db) return _db;

  // Si ya intentamos y falló, no reintentar en cada llamada
  if (_initFailed) {
    throw new Error(
      "Prisma client initialization failed. Check DATABASE_URL environment variable."
    );
  }

  // Reutilizar del global si existe (dev mode hot reload)
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
    console.error("[db] ❌ Error creando Prisma client:", e.message);
    throw e;
  }
}

// Exportar un Proxy que crea el cliente lazy cuando se accede a cualquier propiedad
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
