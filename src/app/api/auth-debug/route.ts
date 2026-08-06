// /api/auth-debug - Diagnostico de login (AUTOCONTENIDO)
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

  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasSecret = !!process.env.NEXTAUTH_SECRET;
  steps.push({
    step: "0. Variables de entorno",
    ok: hasDbUrl && hasSecret,
    detail: `DATABASE_URL=${hasDbUrl ? "OK" : "FALTA"} NEXTAUTH_SECRET=${hasSecret ? "OK" : "FALTA"}`,
  });

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
        id: String(r.id), email: String(r.email),
        passwordHash: r.passwordHash === null ? null : String(r.passwordHash),
        role: String(r.role), plan: String(r.plan),
        banned: Boolean(r.banned),
      };
      steps.push({ step: "1. Buscar usuario en DB", ok: true, detail: `Encontrado: ${user.email}, role=${user.role}` });
    } else {
      steps.push({ step: "1. Buscar usuario en DB", ok: false, detail: `No se encontro "${email}"` });
      return NextResponse.json({ email, steps, conclusion: "USER_NOT_FOUND" });
    }
  } catch (e: any) {
    steps.push({ step: "1. Buscar usuario en DB", ok: false, detail: `Error: ${e.message}` });
    return NextResponse.json({ email, steps, conclusion: "DB_ERROR", error: e.message });
  }

  if (user.banned) {
    steps.push({ step: "2. Baneado", ok: false, detail: "BANEADO" });
    return NextResponse.json({ email, steps, conclusion: "USER_BANNED" });
  }
  steps.push({ step: "2. Baneado", ok: true, detail: "no baneado" });

  if (!user.passwordHash) {
    steps.push({ step: "3. passwordHash", ok: false, detail: "NULL" });
    return NextResponse.json({ email, steps, conclusion: "NO_PASSWORD_HASH" });
  }
  steps.push({ step: "3. passwordHash", ok: true, detail: `presente (len=${user.passwordHash.length})` });

  const hashFormat = /^\$2[abxy]\$\d+\$/.test(user.passwordHash);
  if (!hashFormat) {
    steps.push({ step: "4. Formato bcrypt", ok: false, detail: "invalido" });
    return NextResponse.json({ email, steps, conclusion: "INVALID_HASH_FORMAT" });
  }
  steps.push({ step: "4. Formato bcrypt", ok: true, detail: "valido" });

  try {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      steps.push({ step: "5. bcrypt.compare", ok: false, detail: "FALSE" });
      return NextResponse.json({ email, steps, conclusion: "PASSWORD_MISMATCH" });
    }
    steps.push({ step: "5. bcrypt.compare", ok: true, detail: "TRUE" });
  } catch (e: any) {
    steps.push({ step: "5. bcrypt.compare", ok: false, detail: e.message });
    return NextResponse.json({ email, steps, conclusion: "BCRYPT_ERROR" });
  }

  if (!hasSecret) {
    steps.push({ step: "6. NEXTAUTH_SECRET", ok: false, detail: "FALTA" });
    return NextResponse.json({ email, steps, conclusion: "NO_NEXTAUTH_SECRET" });
  }
  steps.push({ step: "6. NEXTAUTH_SECRET", ok: true, detail: "OK" });

  steps.push({ step: "Conclusion", ok: true, detail: "TODO BIEN. Login deberia funcionar." });
  return NextResponse.json({ email, steps, conclusion: "ALL_CHECKS_PASSED" });
}
