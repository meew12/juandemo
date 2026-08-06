// ════════════════════════════════════════════════════════════
//  /api/setup — Setup completo: crea tablas + carga datos
//  Visitá esta URL DESPUÉS del deploy para inicializar todo
// ════════════════════════════════════════════════════════════
//  Uso: GET /api/setup
//  1. Crea las 20 tablas (ejecutando el schema SQLite)
//  2. Verifica si ya hay datos (idempotente)
//  3. Si no hay datos, carga los 299 registros
//  4. Devuelve un JSON con el estado
// ════════════════════════════════════════════════════════════

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 segundos para operaciones de BD

// ─── Schema SQLite para crear las tablas ───
// Generado a partir de prisma/schema.prisma
const SCHEMA_SQL = `
-- Tabla User
CREATE TABLE IF NOT EXISTS \`User\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`email\` TEXT NOT NULL UNIQUE,
  \`name\` TEXT,
  \`lastName\` TEXT,
  \`passwordHash\` TEXT,
  \`image\` TEXT,
  \`phone\` TEXT,
  \`zone\` TEXT,
  \`bio\` TEXT,
  \`avatarInitials\` TEXT,
  \`role\` TEXT NOT NULL DEFAULT 'user',
  \`plan\` TEXT NOT NULL DEFAULT 'basico',
  \`verified\` INTEGER NOT NULL DEFAULT 0,
  \`banned\` INTEGER NOT NULL DEFAULT 0,
  \`memberSince\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Account
CREATE TABLE IF NOT EXISTS \`Account\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`type\` TEXT NOT NULL,
  \`provider\` TEXT NOT NULL,
  \`providerAccountId\` TEXT NOT NULL,
  \`refresh_token\` TEXT,
  \`access_token\` TEXT,
  \`expires_at\` INTEGER,
  \`token_type\` TEXT,
  \`scope\` TEXT,
  \`id_token\` TEXT,
  \`session_state\` TEXT,
  UNIQUE(\`provider\`, \`providerAccountId\`)
);

-- Tabla Session
CREATE TABLE IF NOT EXISTS \`Session\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`sessionToken\` TEXT NOT NULL UNIQUE,
  \`userId\` TEXT NOT NULL,
  \`expires\` TEXT NOT NULL
);

-- Tabla VerificationToken
CREATE TABLE IF NOT EXISTS \`VerificationToken\` (
  \`identifier\` TEXT NOT NULL,
  \`token\` TEXT NOT NULL UNIQUE,
  \`expires\` TEXT NOT NULL
);

-- Tabla Category
CREATE TABLE IF NOT EXISTS \`Category\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`name\` TEXT NOT NULL,
  \`slug\` TEXT NOT NULL UNIQUE,
  \`icon\` TEXT,
  \`parentId\` TEXT,
  \`order\` INTEGER NOT NULL DEFAULT 0,
  \`featured\` INTEGER NOT NULL DEFAULT 0,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Subcategory
CREATE TABLE IF NOT EXISTS \`Subcategory\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`name\` TEXT NOT NULL,
  \`slug\` TEXT NOT NULL,
  \`categoryId\` TEXT NOT NULL,
  \`icon\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(\`categoryId\`, \`slug\`)
);

-- Tabla Plan
CREATE TABLE IF NOT EXISTS \`Plan\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`name\` TEXT NOT NULL,
  \`slug\` TEXT NOT NULL UNIQUE,
  \`price\` REAL NOT NULL,
  \`currency\` TEXT NOT NULL DEFAULT 'ARS',
  \`interval\` TEXT NOT NULL DEFAULT 'month',
  \`featured\` INTEGER NOT NULL DEFAULT 0,
  \`active\` INTEGER NOT NULL DEFAULT 1,
  \`limits\` TEXT NOT NULL DEFAULT '{}',
  \`benefits\` TEXT NOT NULL DEFAULT '[]',
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Listing
CREATE TABLE IF NOT EXISTS \`Listing\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`categoryId\` TEXT,
  \`title\` TEXT NOT NULL,
  \`slug\` TEXT NOT NULL,
  \`description\` TEXT NOT NULL,
  \`price\` REAL,
  \`currency\` TEXT NOT NULL DEFAULT 'ARS',
  \`images\` TEXT NOT NULL DEFAULT '[]',
  \`thumbs\` TEXT NOT NULL DEFAULT '[]',
  \`attrs\` TEXT NOT NULL DEFAULT '{}',
  \`status\` TEXT NOT NULL DEFAULT 'active',
  \`featured\` INTEGER NOT NULL DEFAULT 0,
  \`views\` INTEGER NOT NULL DEFAULT 0,
  \`expiresAt\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Review
CREATE TABLE IF NOT EXISTS \`Review\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`listingId\` TEXT,
  \`rating\` INTEGER NOT NULL,
  \`comment\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Favorite
CREATE TABLE IF NOT EXISTS \`Favorite\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`listingId\` TEXT NOT NULL,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(\`userId\`, \`listingId\`)
);

-- Tabla Conversation
CREATE TABLE IF NOT EXISTS \`Conversation\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`listingId\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Message
CREATE TABLE IF NOT EXISTS \`Message\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`conversationId\` TEXT NOT NULL,
  \`senderId\` TEXT NOT NULL,
  \`content\` TEXT NOT NULL,
  \`read\` INTEGER NOT NULL DEFAULT 0,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Subscription
CREATE TABLE IF NOT EXISTS \`Subscription\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`planId\` TEXT NOT NULL,
  \`status\` TEXT NOT NULL DEFAULT 'active',
  \`currentPeriodEnd\` TEXT,
  \`cancelAt\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Boost
CREATE TABLE IF NOT EXISTS \`Boost\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`listingId\` TEXT NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`days\` INTEGER NOT NULL,
  \`expiresAt\` TEXT NOT NULL,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Transaction
CREATE TABLE IF NOT EXISTS \`Transaction\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`type\` TEXT NOT NULL,
  \`amount\` REAL NOT NULL,
  \`currency\` TEXT NOT NULL DEFAULT 'ARS',
  \`status\` TEXT NOT NULL DEFAULT 'pending',
  \`reference\` TEXT,
  \`metadata\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Report
CREATE TABLE IF NOT EXISTS \`Report\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`reporterId\` TEXT NOT NULL,
  \`listingId\` TEXT,
  \`userId\` TEXT,
  \`reason\` TEXT NOT NULL,
  \`description\` TEXT,
  \`status\` TEXT NOT NULL DEFAULT 'pending',
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Notification
CREATE TABLE IF NOT EXISTS \`Notification\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`type\` TEXT NOT NULL,
  \`title\` TEXT NOT NULL,
  \`message\` TEXT NOT NULL,
  \`read\` INTEGER NOT NULL DEFAULT 0,
  \`link\` TEXT,
  \`metadata\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla SiteConfig
CREATE TABLE IF NOT EXISTS \`SiteConfig\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`key\` TEXT NOT NULL UNIQUE,
  \`value\` TEXT NOT NULL,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla AuditLog
CREATE TABLE IF NOT EXISTS \`AuditLog\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT,
  \`action\` TEXT NOT NULL,
  \`entity\` TEXT NOT NULL,
  \`entityId\` TEXT,
  \`metadata\` TEXT,
  \`ip\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

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
  const log: string[] = [];
  const url = process.env.DATABASE_URL;

  if (!url) {
    return NextResponse.json(
      {
        status: "error",
        error: "DATABASE_URL no está configurada en Vercel",
        hint: "Andá a Settings → Environment Variables y agregá DATABASE_URL con tu URL de Turso",
      },
      { status: 500 }
    );
  }

  log.push(`📍 DATABASE_URL: ${url.replace(/authToken=[^&]+/, "authToken=***")}`);

  try {
    const client = createClient({ url });

    // ─── Paso 1: Crear todas las tablas ───
    log.push("🔧 Paso 1: Creando tablas...");
    const schemaStatements = parseSql(SCHEMA_SQL);
    let tablesCreated = 0;
    let tableErrors = 0;

    for (const stmt of schemaStatements) {
      try {
        await client.execute(stmt);
        tablesCreated++;
      } catch (e: any) {
        // "table already exists" no es error real
        if (!e.message.includes("already exists")) {
          tableErrors++;
          log.push(`   ⚠️ ${e.message.substring(0, 100)}`);
        }
      }
    }
    log.push(`   ✅ ${tablesCreated} tablas verificadas/creadas (${tableErrors} errores)`);

    // ─── Paso 2: Verificar si ya hay datos ───
    log.push("📊 Paso 2: Verificando datos existentes...");
    let userCount = 0;
    try {
      const result = await client.execute("SELECT COUNT(*) as count FROM User");
      userCount = Number(result.rows[0].count);
      log.push(`   📈 Usuarios actuales: ${userCount}`);
    } catch (e: any) {
      log.push(`   ❌ No se puede leer User: ${e.message}`);
      return NextResponse.json(
        { status: "error", step: "verify", log, error: e.message },
        { status: 500 }
      );
    }

    if (userCount > 0) {
      log.push("✅ La base ya tiene datos. NO se carga nada.");
      return NextResponse.json({
        status: "already_seeded",
        message: `La base ya tiene ${userCount} usuarios. Todo listo.`,
        userCount,
        log,
      });
    }

    // ─── Paso 3: Cargar datos desde umpi_turso.sql ───
    log.push("🌱 Paso 3: Cargando datos iniciales...");
    const sqlPath = join(process.cwd(), "database", "umpi_turso.sql");
    let sql: string;
    try {
      sql = readFileSync(sqlPath, "utf8");
      log.push(`   📄 Archivo leído: ${sqlPath}`);
    } catch (e: any) {
      log.push(`   ❌ No se pudo leer ${sqlPath}: ${e.message}`);
      return NextResponse.json(
        {
          status: "error",
          step: "read_sql",
          log,
          hint: "El archivo database/umpi_turso.sql no está en el deploy. Verificá que esté en GitHub.",
        },
        { status: 500 }
      );
    }

    const statements = parseSql(sql);
    log.push(`   📋 ${statements.length} statements a ejecutar...`);

    let success = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (let i = 0; i < statements.length; i++) {
      try {
        await client.execute(statements[i]);
        success++;
        if ((i + 1) % 50 === 0) {
          log.push(`   ${i + 1}/${statements.length}...`);
        }
      } catch (e: any) {
        errors++;
        if (errorDetails.length < 5) {
          errorDetails.push(`Stmt ${i + 1}: ${e.message.substring(0, 150)}`);
        }
      }
    }

    log.push(`   ✅ ${success} statements OK, ${errors} errores`);

    // ─── Paso 4: Verificación final ───
    log.push("✅ Paso 4: Verificación final...");
    const checks: Record<string, number> = {};
    for (const table of ["User", "Listing", "Plan", "Category", "Review", "Notification", "Subscription", "Transaction"]) {
      try {
        const r = await client.execute(`SELECT COUNT(*) as n FROM ${table}`);
        checks[table] = Number(r.rows[0].n);
      } catch {
        checks[table] = -1;
      }
    }
    log.push(`   📊 Resultado: ${JSON.stringify(checks)}`);

    return NextResponse.json({
      status: errors === 0 ? "success" : "partial",
      message: `${success} statements ejecutados, ${errors} errores`,
      stats: checks,
      log,
      errors: errorDetails,
    });
  } catch (e: any) {
    log.push(`❌ Error fatal: ${e.message}`);
    return NextResponse.json(
      { status: "error", error: e.message, log },
      { status: 500 }
    );
  }
}
