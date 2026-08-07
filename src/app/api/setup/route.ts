// ════════════════════════════════════════════════════════════
//  /api/setup — Setup completo: crea tablas + carga datos
//  Visitá esta URL DESPUÉS del deploy para inicializar todo
// ════════════════════════════════════════════════════════════
//  Uso: GET /api/setup
//  1. Crea las 20 tablas (ejecutando el schema SQLite)
//  2. Verifica si ya hay datos (idempotente)
//  3. Si no hay datos, carga los 299 registros
//  4. Devuelve un JSON con el estado
//
//  IMPORTANTE: Esta ruta detecta automáticamente el authToken
//  desde:
//    a) ?authToken=xxx en DATABASE_URL, o
//    b) variable separada TURSO_AUTH_TOKEN
//  Si falta, devuelve instrucciones claras con el formato correcto.
// ════════════════════════════════════════════════════════════

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 segundos para operaciones de BD

// ─── Schema SQLite para crear las tablas ───
// Sincronizado EXACTAMENTE con prisma/schema.prisma y database/umpi_turso.sql
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
  \`expires\` TEXT NOT NULL,
  UNIQUE(\`identifier\`, \`token\`)
);

-- Tabla Category
CREATE TABLE IF NOT EXISTS \`Category\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`slug\` TEXT NOT NULL UNIQUE,
  \`name\` TEXT NOT NULL,
  \`type\` TEXT NOT NULL,
  \`icon\` TEXT,
  \`description\` TEXT,
  \`count\` INTEGER NOT NULL DEFAULT 0,
  \`order\` INTEGER NOT NULL DEFAULT 0,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Subcategory
CREATE TABLE IF NOT EXISTS \`Subcategory\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`categoryId\` TEXT NOT NULL,
  \`name\` TEXT NOT NULL,
  \`slug\` TEXT NOT NULL,
  \`count\` INTEGER NOT NULL DEFAULT 0,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(\`categoryId\`, \`slug\`)
);

-- Tabla Plan
CREATE TABLE IF NOT EXISTS \`Plan\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`slug\` TEXT NOT NULL UNIQUE,
  \`name\` TEXT NOT NULL,
  \`price\` REAL NOT NULL,
  \`currency\` TEXT NOT NULL DEFAULT 'ARS',
  \`interval\` TEXT NOT NULL DEFAULT 'month',
  \`description\` TEXT,
  \`features\` TEXT NOT NULL DEFAULT '[]',
  \`maxListings\` INTEGER NOT NULL DEFAULT 1,
  \`maxFeatured\` INTEGER NOT NULL DEFAULT 0,
  \`badgeVerified\` INTEGER NOT NULL DEFAULT 0,
  \`top10Access\` INTEGER NOT NULL DEFAULT 0,
  \`multiUser\` INTEGER NOT NULL DEFAULT 1,
  \`apiAccess\` INTEGER NOT NULL DEFAULT 0,
  \`prioritySupport\` INTEGER NOT NULL DEFAULT 0,
  \`monthlyReport\` INTEGER NOT NULL DEFAULT 0,
  \`invoiceType\` TEXT,
  \`active\` INTEGER NOT NULL DEFAULT 1,
  \`order\` INTEGER NOT NULL DEFAULT 0,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Listing
CREATE TABLE IF NOT EXISTS \`Listing\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`slug\` TEXT NOT NULL UNIQUE,
  \`title\` TEXT NOT NULL,
  \`description\` TEXT NOT NULL,
  \`categoryType\` TEXT NOT NULL,
  \`categoryId\` TEXT,
  \`subcategoryId\` TEXT,
  \`price\` REAL NOT NULL,
  \`currency\` TEXT NOT NULL DEFAULT 'ARS',
  \`priceUnit\` TEXT,
  \`location\` TEXT,
  \`zone\` TEXT,
  \`province\` TEXT,
  \`images\` TEXT NOT NULL DEFAULT '[]',
  \`thumbs\` TEXT NOT NULL DEFAULT '[]',
  \`attrs\` TEXT NOT NULL DEFAULT '{}',
  \`rating\` REAL NOT NULL DEFAULT 0,
  \`reviewCount\` INTEGER NOT NULL DEFAULT 0,
  \`views\` INTEGER NOT NULL DEFAULT 0,
  \`contactCount\` INTEGER NOT NULL DEFAULT 0,
  \`badge\` TEXT,
  \`featured\` INTEGER NOT NULL DEFAULT 0,
  \`featuredUntil\` TEXT,
  \`boostLevel\` INTEGER NOT NULL DEFAULT 0,
  \`status\` TEXT NOT NULL DEFAULT 'active',
  \`rejectionReason\` TEXT,
  \`sellerId\` TEXT NOT NULL,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Review
CREATE TABLE IF NOT EXISTS \`Review\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`listingId\` TEXT NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`rating\` INTEGER NOT NULL,
  \`comment\` TEXT NOT NULL,
  \`status\` TEXT NOT NULL DEFAULT 'active',
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(\`listingId\`, \`userId\`)
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
  \`plan\` TEXT NOT NULL,
  \`status\` TEXT NOT NULL DEFAULT 'active',
  \`startDate\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`currentPeriodEnd\` TEXT,
  \`cancelAtPeriodEnd\` INTEGER NOT NULL DEFAULT 0,
  \`mercadopagoId\` TEXT,
  \`mercadopagoPreapprovalId\` TEXT,
  \`amount\` REAL NOT NULL DEFAULT 0,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Boost
CREATE TABLE IF NOT EXISTS \`Boost\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`listingId\` TEXT NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`type\` TEXT NOT NULL,
  \`durationDays\` INTEGER NOT NULL,
  \`amount\` REAL NOT NULL DEFAULT 0,
  \`status\` TEXT NOT NULL DEFAULT 'pending',
  \`startDate\` TEXT,
  \`endDate\` TEXT,
  \`mercadopagoPaymentId\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Transaction
CREATE TABLE IF NOT EXISTS \`Transaction\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`txId\` TEXT NOT NULL UNIQUE,
  \`userId\` TEXT NOT NULL,
  \`subscriptionId\` TEXT,
  \`boostId\` TEXT,
  \`concept\` TEXT NOT NULL,
  \`method\` TEXT NOT NULL,
  \`amount\` REAL NOT NULL,
  \`currency\` TEXT NOT NULL DEFAULT 'ARS',
  \`status\` TEXT NOT NULL DEFAULT 'pending',
  \`mercadopagoPaymentId\` TEXT,
  \`mercadopagoPreferenceId\` TEXT,
  \`invoiceType\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Report
CREATE TABLE IF NOT EXISTS \`Report\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`reporterId\` TEXT NOT NULL,
  \`reportedUserId\` TEXT,
  \`listingId\` TEXT,
  \`reason\` TEXT NOT NULL,
  \`description\` TEXT,
  \`status\` TEXT NOT NULL DEFAULT 'open',
  \`resolution\` TEXT,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Notification
CREATE TABLE IF NOT EXISTS \`Notification\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT NOT NULL,
  \`type\` TEXT NOT NULL,
  \`title\` TEXT NOT NULL,
  \`body\` TEXT NOT NULL,
  \`link\` TEXT,
  \`read\` INTEGER NOT NULL DEFAULT 0,
  \`createdAt\` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla SiteConfig
CREATE TABLE IF NOT EXISTS \`SiteConfig\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`key\` TEXT NOT NULL UNIQUE,
  \`value\` TEXT NOT NULL
);

-- Tabla AuditLog
CREATE TABLE IF NOT EXISTS \`AuditLog\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`userId\` TEXT,
  \`action\` TEXT NOT NULL,
  \`entity\` TEXT,
  \`entityId\` TEXT,
  \`details\` TEXT,
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

// ─── Helper: extraer URL y authToken de DATABASE_URL ───
// Acepta ambos formatos:
//   a) libsql://xxx.turso.io?authToken=eyJxxx
//   b) libsql://xxx.turso.io  +  variable separada TURSO_AUTH_TOKEN=eyJxxx
function parseDatabaseUrl(rawUrl: string): {
  url: string;
  authToken: string | undefined;
  hasTokenInUrl: boolean;
  hasTokenEnv: boolean;
} {
  let url = rawUrl;
  let authToken: string | undefined;
  let hasTokenInUrl = false;

  if (url.includes("?authToken=") || url.includes("&authToken=")) {
    try {
      const urlObj = new URL(url);
      authToken = urlObj.searchParams.get("authToken") ?? undefined;
      // quitar el authToken de la URL para logging
      urlObj.searchParams.delete("authToken");
      url = urlObj.toString();
      hasTokenInUrl = true;
    } catch {
      // si falla el parse, dejar URL original
    }
  }

  // Si no había token en la URL, buscar en variable separada
  const hasTokenEnv = !!process.env.TURSO_AUTH_TOKEN;
  if (!authToken && process.env.TURSO_AUTH_TOKEN) {
    authToken = process.env.TURSO_AUTH_TOKEN;
  }

  return { url, authToken, hasTokenInUrl, hasTokenEnv };
}

export async function GET(request: Request) {
  const log: string[] = [];
  const rawUrl = process.env.DATABASE_URL;
  const { searchParams } = new URL(request.url);
  const forceReset = searchParams.get("force") === "1";

  if (!rawUrl) {
    return NextResponse.json(
      {
        status: "error",
        error: "DATABASE_URL no está configurada en Vercel",
        hint: "Andá a Settings → Environment Variables y agregá DATABASE_URL con tu URL de Turso",
      },
      { status: 500 }
    );
  }

  const { url, authToken, hasTokenInUrl, hasTokenEnv } = parseDatabaseUrl(rawUrl);

  // ─── Detectar falta de authToken (CAUSA #1 del HTTP 401) ───
  if ((url.startsWith("libsql://") || url.startsWith("libsql+ws://")) && !authToken) {
    log.push("❌ ERROR DE AUTENTICACIÓN: Falta el authToken de Turso");
    log.push(`📍 DATABASE_URL = ${url}`);
    log.push(`📍 TURSO_AUTH_TOKEN = ${hasTokenEnv ? "(presente)" : "(NO configurada)"}`);
    log.push("");
    log.push("── CÓMO ARREGLARLO ──");
    log.push("En Vercel → Settings → Environment Variables, editá DATABASE_URL y dejala así:");
    log.push("");
    log.push(`   ${url}?authToken=eyJhbGciOi...TU_TOKEN_REAL_AQUI`);
    log.push("");
    log.push("Para conseguir tu token,_andá a:");
    log.push("   https://app.turso.com/app/tatabases → tu DB → Settings → Tokens");
    log.push("   (creá un token nuevo con 'Create Token' si no tenés uno)");
    log.push("");
    log.push("Alternativamente, podés dejar DATABASE_URL sin token y crear otra variable:");
    log.push("   TURSO_AUTH_TOKEN = eyJhbGciOi...TU_TOKEN_REAL_AQUI");
    log.push("");
    log.push("Después de cambiar las variables, esperá 1 min y volvé a cargar /api/setup.");

    return NextResponse.json(
      {
        status: "error",
        step: "auth_missing",
        error: "HTTP 401 — Falta authToken de Turso en DATABASE_URL o variable TURSO_AUTH_TOKEN",
        action_needed:
          "En Vercel → Settings → Environment Variables: editá DATABASE_URL agregando '?authToken=TU_TOKEN' al final. Obtenelo en https://app.turso.com → tu DB → Settings → Tokens",
        database_url_format: `${url}?authToken=TU_TOKEN_AQUI`,
        turso_panel_url: "https://app.turso.com/app/tatabases",
        log,
      },
      { status: 401 }
    );
  }

  log.push(`📍 DATABASE_URL: ${url}`);
  log.push(`🔑 Auth token: ${hasTokenInUrl ? "en URL (?authToken=)" : hasTokenEnv ? "en variable TURSO_AUTH_TOKEN" : "no necesario (SQLite local)"}`);

  try {
    const client = createClient({ url, authToken });

    // ─── Paso 0 (opcional): Force reset — borrar tablas viejas con schema desactualizado ───
    if (forceReset) {
      log.push("⚠️ Paso 0: MODO FORCE — Borrando todas las tablas existentes...");
      // Borrar foreign keys primero para evitar conflictos
      try {
        await client.execute("PRAGMA foreign_keys = OFF;");
      } catch {}
      const tableNames = [
        "AuditLog", "SiteConfig", "Notification", "Report", "Transaction",
        "Boost", "Subscription", "Message", "Conversation", "Favorite",
        "Review", "Listing", "Subcategory", "Category", "VerificationToken",
        "Session", "Account", "Plan", "User",
      ];
      // Intentar borrar cada tabla, ignorar errores
      for (const table of tableNames) {
        try {
          await client.execute(`DROP TABLE IF EXISTS \`${table}\`;`);
          log.push(`   🗑️ Tabla ${table} borrada`);
        } catch (e: any) {
          log.push(`   ⚠️ No se pudo borrar ${table}: ${e.message.substring(0, 60)}`);
        }
      }
      // Segundo intento: tablas que pudieron quedar por FK
      for (const table of tableNames) {
        try {
          await client.execute(`DROP TABLE IF EXISTS \`${table}\`;`);
        } catch {}
      }
      try {
        await client.execute("PRAGMA foreign_keys = ON;");
      } catch {}
      log.push("   ✅ Tablas viejas eliminadas");
    }

    // ─── Paso 1: Crear todas las tablas ───
    log.push("🔧 Paso 1: Creando tablas...");
    const schemaStatements = parseSql(SCHEMA_SQL);
    let tablesCreated = 0;
    let tableErrors = 0;
    let first401 = false;

    for (const stmt of schemaStatements) {
      try {
        await client.execute(stmt);
        tablesCreated++;
      } catch (e: any) {
        const msg = e.message || "";
        // "table already exists" no es error real
        if (msg.includes("already exists")) {
          // ignore
        } else if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("not authenticated")) {
          first401 = true;
          tableErrors++;
        } else {
          tableErrors++;
          if (tableErrors <= 3) log.push(`   ⚠️ ${msg.substring(0, 100)}`);
        }
      }
    }
    log.push(`   ✅ ${tablesCreated} tablas verificadas/creadas (${tableErrors} errores)`);

    // ─── Si vemos 401 en cada query, es claro que el token es inválido ───
    if (first401 || tableErrors >= 5) {
      log.push("");
      log.push("❌ DETECTADO: Errores 401 en TODAS las consultas");
      log.push("Esto significa que el authToken es INVÁLIDO o EXPIRÓ.");
      log.push("");
      log.push("── SOLUCIÓN ──");
      log.push("1. Andá a https://app.turso.com/app/tatabases");
      log.push("2. Seleccioná tu DB (umpi-softw)");
      log.push("3. Andá a Settings → Tokens → Create Token");
      log.push("4. Copiá el token generado (empieza con 'eyJ...')");
      log.push("5. En Vercel → Settings → Environment Variables:");
      log.push("   Editá DATABASE_URL reemplazando el token viejo, o agregá:");
      log.push("   TURSO_AUTH_TOKEN = <token nuevo>");
      log.push("6. Esperá 1-2 min y volvé a cargar /api/setup");

      return NextResponse.json(
        {
          status: "error",
          step: "tables",
          error: "HTTP 401 — authToken inválido o expirado",
          action_needed:
            "El token de Turso que pusiste en Vercel es inválido o expiró. Generá uno nuevo en https://app.turso.com → tu DB → Settings → Tokens → Create Token. Luego actualizá la variable DATABASE_URL o TURSO_AUTH_TOKEN en Vercel.",
          turso_panel_url: "https://app.turso.com/app/tatabases",
          log,
        },
        { status: 401 }
      );
    }

    // ─── Paso 2: Verificar si ya hay datos ───
    log.push("📊 Paso 2: Verificando datos existentes...");
    let userCount = 0;
    let listingCount = 0;
    let planCount = 0;
    let categoryCount = 0;
    try {
      const result = await client.execute("SELECT COUNT(*) as count FROM User");
      userCount = Number(result.rows[0].count);
      log.push(`   📈 Usuarios actuales: ${userCount}`);
      try { listingCount = Number((await client.execute("SELECT COUNT(*) as c FROM Listing")).rows[0].c); } catch {}
      try { planCount = Number((await client.execute("SELECT COUNT(*) as c FROM Plan")).rows[0].c); } catch {}
      try { categoryCount = Number((await client.execute("SELECT COUNT(*) as c FROM Category")).rows[0].c); } catch {}
      log.push(`   📈 Listings: ${listingCount} | Plans: ${planCount} | Categories: ${categoryCount}`);
    } catch (e: any) {
      log.push(`   ❌ No se puede leer User: ${e.message}`);
      return NextResponse.json(
        { status: "error", step: "verify", log, error: e.message },
        { status: 500 }
      );
    }

    // ─── Detectar carga parcial (usuarios cargados pero otras tablas vacías) ───
    // Esto pasa cuando se corrió setup con un schema viejo y se cargaron solo los INSERTs que no dependían de columnas faltantes.
    if (userCount > 0 && (listingCount === 0 || planCount === 0 || categoryCount === 0) && !forceReset) {
      log.push("");
      log.push("⚠️ DETECTADO: Carga parcial de datos");
      log.push(`   Hay ${userCount} usuarios pero faltan:`);
      if (listingCount === 0) log.push("   · Listings (publicaciones)");
      if (planCount === 0) log.push("   · Plans (planes de suscripción)");
      if (categoryCount === 0) log.push("   · Categories (categorías)");
      log.push("");
      log.push("Esto ocurre cuando el schema está desactualizado (faltan columnas como 'type' en Category, etc.)");
      log.push("");
      log.push("── SOLUCIÓN ──");
      log.push("Visitá esta URL para forzar reset completo (borra y recrea todas las tablas con schema correcto):");
      log.push(`   ${request.url.split("?")[0]}?force=1`);
      log.push("");
      log.push("⚠️ ATENCIÓN: Esto borrará TODOS los datos actuales. Si tenés datos importantes, hacé backup primero.");

      return NextResponse.json({
        status: "partial_load_detected",
        message:
          "Detecté que el schema está desactualizado: hay usuarios pero faltan listings/planes/categorías. Visitá /api/setup?force=1 para recrear todo desde cero con el schema correcto.",
        counts: { users: userCount, listings: listingCount, plans: planCount, categories: categoryCount },
        fix_url: `${request.url.split("?")[0]}?force=1`,
        warning: "Esto borrará TODOS los datos actuales y los volverá a cargar desde umpi_turso.sql",
        log,
      });
    }

    if (userCount > 0 && listingCount > 0 && planCount > 0 && categoryCount > 0) {
      log.push("✅ La base ya tiene datos completos. NO se carga nada.");
      return NextResponse.json({
        status: "already_seeded",
        message: `La base ya tiene ${userCount} usuarios, ${listingCount} listings, ${planCount} planes, ${categoryCount} categorías. Todo listo.`,
        userCount,
        counts: { users: userCount, listings: listingCount, plans: planCount, categories: categoryCount },
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
