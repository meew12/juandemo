// ════════════════════════════════════════════════════════════
//  /api/auth-debug — Diagnóstico de login AUTOCONTENIDO
//  No depende de Prisma ni de db-raw.ts
// ════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient, type Client } from "@libsql/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "admin@umpi.com.ar").toLowerCase().trim();
  const password = searchParams.get("password") || "admin123";

  const steps: { step: string; ok: boolean; detail: string }[] = [];

  // Paso 0: Variables de entorno
  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasSecret = !!process.env.NEXTAUTH_SECRET;
  steps.push({
    step: "0. Variables de entorno",
    ok: hasDbUrl && hasSecret,
    detail: `DATABASE_URL=${hasDbUrl ? "OK" : "FALTA"} NEXTAUTH_SECRET=${hasSecret ? "OK" : "FALTA"}`,
  });

  // Paso 1: Buscar usuario
  let user: any = null;
  try {
    const client = getDbClient();
    const result = await client.execute({
      sql: `SELECT id, email, name, lastName, passwordHash, role, plan, banned, verified FROM User WHERE email = ? LIMIT 1`,
      args: [email],
    });

    if (result.rows.length > 0) {
      const r = result.rows[0];
      user = {
        id: String(r.id),
        email: String(r.email),
        passwordHash: r.passwordHash === null ? null : String(r.passwordHash),
        role: String(r.role),
        plan: String(r.plan),
        banned: Boolean(r.banned),
      };
      steps.push({
        step: "1. Buscar usuario en DB",
        ok: true,
        detail: `Encontrado: id=${user.id.substring(0, 12)}..., email=${user.email}, role=${user.role}, plan=${user.plan}`,
      });
    } else {
      steps.push({
        step: "1. Buscar usuario en DB",
        ok: false,
        detail: `No se encontro usuario con email "${email}"`,
      });
      return NextResponse.json({ email, steps, conclusion: "USER_NOT_FOUND" });
    }
  } catch (e: any) {
    steps.push({
      step: "1. Buscar usuario en DB",
      ok: false,
      detail: `Error de DB: ${e.message}`,
    });
    return NextResponse.json({ email, steps, conclusion: "DB_ERROR", error: e.message });
  }

  // Paso 2: Baneado?
  if (user.banned) {
    steps.push({ step: "2. Verificar baneo", ok: false, detail: "Usuario BANEADO" });
    return NextResponse.json({ email, steps, conclusion: "USER_BANNED" });
  }
  steps.push({ step: "2. Verificar baneo", ok: true, detail: "banned = false" });

  // Paso 3: passwordHash?
  if (!user.passwordHash) {
    steps.push({ step: "3. passwordHash", ok: false, detail: "passwordHash es NULL" });
    return NextResponse.json({ email, steps, conclusion: "NO_PASSWORD_HASH" });
  }
  steps.push({ step: "3. passwordHash", ok: true, detail: `presente (longitud: ${user.passwordHash.length})` });

  // Paso 4: Formato bcrypt?
  const hashFormat = /^\$2[abxy]\$\d+\$/.test(user.passwordHash);
  if (!hashFormat) {
    steps.push({ step: "4. Formato bcrypt", ok: false, detail: `Invalido: ${user.passwordHash.substring(0, 10)}` });
    return NextResponse.json({ email, steps, conclusion: "INVALID_HASH_FORMAT" });
  }
  steps.push({ step: "4. Formato bcrypt", ok: true, detail: "valido" });

  // Paso 5: bcrypt.compare?
  try {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      steps.push({ step: "5. Comparar password", ok: false, detail: `bcrypt.compare = FALSE` });
      return NextResponse.json({ email, steps, conclusion: "PASSWORD_MISMATCH" });
    }
    steps.push({ step: "5. Comparar password", ok: true, detail: `bcrypt.compare = TRUE` });
  } catch (e: any) {
    steps.push({ step: "5. Comparar password", ok: false, detail: `Error: ${e.message}` });
    return NextResponse.json({ email, steps, conclusion: "BCRYPT_ERROR" });
  }

  // Paso 6: NEXTAUTH_SECRET?
  if (!hasSecret) {
    steps.push({ step: "6. NEXTAUTH_SECRET", ok: false, detail: "NO configurado" });
    return NextResponse.json({ email, steps, conclusion: "NO_NEXTAUTH_SECRET" });
  }
  steps.push({ step: "6. NEXTAUTH_SECRET", ok: true, detail: "configurado" });

  steps.push({ step: "Conclusion", ok: true, detail: "TODO BIEN. El login deberia funcionar." });

  return NextResponse.json({
    email,
    steps,
    conclusion: "ALL_CHECKS_PASSED",
  });
}
