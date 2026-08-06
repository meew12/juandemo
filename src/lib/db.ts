// ════════════════════════════════════════════════════════════
//  Cliente Prisma con soporte para Turso (libSQL) y SQLite local
// ════════════════════════════════════════════════════════════
//  - Si DATABASE_URL empieza con "libsql://" → usa Turso (producción)
//  - Si empieza con "file:" → usa SQLite local (desarrollo)
//  - El adapter se carga solo cuando es necesario

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  // ─── Caso 1: Turso / libSQL remoto (producción en Vercel) ───
  if (databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("libsql+ws://")) {
    console.log("[db] Conectando a Turso (libSQL remoto)");

    // El authToken puede venir como query param ?authToken=xxx
    // o como variable separada TURSO_AUTH_TOKEN
    let url = databaseUrl;
    let authToken = process.env.TURSO_AUTH_TOKEN;

    // Si la URL ya tiene ?authToken=, extraerlo
    if (url.includes("?authToken=")) {
      const urlObj = new URL(url);
      authToken = urlObj.searchParams.get("authToken") ?? undefined;
      url = url.replace(/\?authToken=.*$/, "");
    }

    const libsql = createClient({
      url,
      authToken,
    });

    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  // ─── Caso 2: SQLite local (desarrollo) ───
  console.log("[db] Conectando a SQLite local");
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
