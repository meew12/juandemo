import { NextResponse } from "next/server";
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
    },
    prismaTests: [],
  };

  try {
    const userCount = await db.user.count();
    result.prismaTests.push({ test: "db.user.count()", ok: true, result: `${userCount} usuarios` });
  } catch (e: any) {
    result.prismaTests.push({ test: "db.user.count()", ok: false, error: e.message });
  }

  try {
    const listingCount = await db.listing.count();
    result.prismaTests.push({ test: "db.listing.count()", ok: true, result: `${listingCount} publicaciones` });
  } catch (e: any) {
    result.prismaTests.push({ test: "db.listing.count()", ok: false, error: e.message });
  }

  try {
    const firstUser = await db.user.findFirst({ select: { id: true, email: true, role: true } });
    result.prismaTests.push({
      test: "db.user.findFirst()",
      ok: true,
      result: firstUser ? `email=${firstUser.email}, role=${firstUser.role}` : "no users",
    });
  } catch (e: any) {
    result.prismaTests.push({ test: "db.user.findFirst()", ok: false, error: e.message });
  }

  const allOk = result.prismaTests.every((t: any) => t.ok);
  result.conclusion = allOk ? "PRISMA_WORKS" : "PRISMA_BROKEN";
  return NextResponse.json(result, { status: allOk ? 200 : 500 });
}