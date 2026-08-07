// ════════════════════════════════════════════════════════════
//  /api/db-test — Diagnóstico de conexión a base de datos
//  Visita esta URL para ver si la BD responde correctamente.
//  Ahora prueba AMBOS caminos: Prisma (que suele romperse en
//  Vercel) y libsql directo (que es el que usan los endpoints).
// ════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { countUsers, countListings, getUserById, findUsers } from "@/lib/db-raw";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 30) + "..."
        : "(none)",
      hasTursoAuthToken: !!process.env.TURSO_AUTH_TOKEN,
      nodeEnv: process.env.NODE_ENV,
    },
    libsqlTests: [],
    prismaTests: [],
  };

  // ─── Test libsql directo (el que usan todos los endpoints) ───
  // Test 1: User count
  try {
    const userCount = await countUsers();
    result.libsqlTests.push({
      test: "countUsers()",
      ok: true,
      result: `${userCount} usuarios`,
    });
  } catch (e: any) {
    result.libsqlTests.push({
      test: "countUsers()",
      ok: false,
      error: e.message,
    });
  }

  // Test 2: Listing count
  try {
    const listingCount = await countListings();
    result.libsqlTests.push({
      test: "countListings()",
      ok: true,
      result: `${listingCount} publicaciones`,
    });
  } catch (e: any) {
    result.libsqlTests.push({
      test: "countListings()",
      ok: false,
      error: e.message,
    });
  }

  // Test 3: Find first user
  try {
    const users = await findUsers({}, { limit: 1 });
    const firstUser = users[0] || null;
    result.libsqlTests.push({
      test: "findUsers(limit:1)",
      ok: true,
      result: firstUser
        ? `email=${firstUser.email}, role=${firstUser.role}, plan=${firstUser.plan}`
        : "no users found",
    });
  } catch (e: any) {
    result.libsqlTests.push({
      test: "findUsers(limit:1)",
      ok: false,
      error: e.message,
    });
  }

  // ─── Test Prisma (informativo — muestra si sigue roto) ───
  try {
    const userCount = await db.user.count();
    result.prismaTests.push({
      test: "db.user.count()",
      ok: true,
      result: `${userCount} usuarios`,
    });
  } catch (e: any) {
    result.prismaTests.push({
      test: "db.user.count()",
      ok: false,
      error: e.message,
    });
  }

  // Conclusión
  const libsqlOk = result.libsqlTests.every((t: any) => t.ok);
  const prismaOk = result.prismaTests.every((t: any) => t.ok);
  result.libsqlOk = libsqlOk;
  result.prismaOk = prismaOk;
  result.conclusion = libsqlOk
    ? prismaOk
      ? "ALL_WORKING - libsql y Prisma funcionan"
      : "LIBSQL_WORKING - los endpoints funcionan via libsql directo (Prisma sigue roto pero no afecta funcionalidad)"
    : "DB_BROKEN - ni libsql funciona, revisá DATABASE_URL";
  result.overallOk = libsqlOk;

  return NextResponse.json(result, { status: libsqlOk ? 200 : 500 });
}
