// ════════════════════════════════════════════════════════════
//  /api/setup — Carga datos iniciales a Turso (endpoint manual)
//  Visitar esta URL después del deploy si los datos no se cargaron
// ════════════════════════════════════════════════════════════
//  Uso: GET /api/setup
//  - Si la BD ya tiene datos → responde "ya cargada"
//  - Si está vacía → lee database/umpi_turso.sql y lo ejecuta
// ════════════════════════════════════════════════════════════

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSql(sql: string): string[] {
  const lines = sql.split("\n");
  const cleanLines = lines.filter((line) => !line.trim().startsWith("--"));
  const cleanSql = cleanLines.join("\n");

  return cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => {
      const upper = s.toUpperCase();
      return (
        !upper.startsWith("PRAGMA") &&
        !upper.startsWith("BEGIN") &&
        !upper.startsWith("COMMIT") &&
        !upper.startsWith("SET ")
      );
    });
}

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json(
      { error: "DATABASE_URL no configurada", step: "env" },
      { status: 500 }
    );
  }

  try {
    const client = createClient({ url });

    // ─── Verificar si ya hay datos ───
    let userCount = 0;
    try {
      const result = await client.execute("SELECT COUNT(*) as count FROM User");
      userCount = Number(result.rows[0].count);
    } catch (e: any) {
      return NextResponse.json(
        {
          error: "No se puede consultar la tabla User. ¿Las tablas fueron creadas?",
          hint: "Ejecutá 'npx prisma db push' primero, o esperá a que el build de Vercel lo haga.",
          detail: e.message,
        },
        { status: 500 }
      );
    }

    if (userCount > 0) {
      return NextResponse.json({
        status: "already_seeded",
        message: `La base ya tiene ${userCount} usuarios. No se cargó nada.`,
        userCount,
      });
    }

    // ─── Leer SQL ───
    const sqlPath = join(process.cwd(), "database", "umpi_turso.sql");
    let sql: string;
    try {
      sql = readFileSync(sqlPath, "utf8");
    } catch (e: any) {
      return NextResponse.json(
        {
          error: "No se pudo leer database/umpi_turso.sql",
          hint: "Asegurate de que el archivo esté en el repo de GitHub.",
          path: sqlPath,
        },
        { status: 500 }
      );
    }

    // ─── Parsear y ejecutar ───
    const statements = parseSql(sql);
    let success = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (let i = 0; i < statements.length; i++) {
      try {
        await client.execute(statements[i]);
        success++;
      } catch (e: any) {
        errors++;
        if (errorDetails.length < 5) {
          errorDetails.push(`Statement ${i + 1}: ${e.message.substring(0, 200)}`);
        }
      }
    }

    // ─── Verificar ───
    const checks: Record<string, number> = {};
    for (const table of ["User", "Listing", "Plan", "Category", "Review"]) {
      try {
        const r = await client.execute(`SELECT COUNT(*) as n FROM ${table}`);
        checks[table] = Number(r.rows[0].n);
      } catch {
        checks[table] = -1;
      }
    }

    return NextResponse.json({
      status: errors === 0 ? "success" : "partial",
      message: `${success} statements ejecutados, ${errors} errores`,
      stats: checks,
      errors: errorDetails,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
