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

export async function POST(req: Request) {
  try {
    const { name, lastName, email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Email y contraseña (mín. 6 caracteres) son obligatorios" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    const emailLower = email.toLowerCase().trim();

    // Verificar si ya existe
    const existing = await client.execute({
      sql: `SELECT id FROM User WHERE email = ? LIMIT 1`,
      args: [emailLower],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      );
    }

    // Crear usuario
    const passwordHash = await bcrypt.hash(password, 10);
    const initials = ((name?.[0] || "U") + (lastName?.[0] || "")).toUpperCase();
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    const now = Math.floor(Date.now());

    await client.execute({
      sql: `INSERT INTO User (id, email, name, lastName, passwordHash, role, plan, verified, banned, avatarInitials, memberSince, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, 'user', 'basico', 0, 0, ?, ?, ?, ?)`,
      args: [id, emailLower, name || "", lastName || "", passwordHash, initials, now, now, now],
    });

    return NextResponse.json({ success: true, userId: id });
  } catch (err: any) {
    console.error("Register error:", err.message);
    return NextResponse.json(
      { error: "Error interno del servidor: " + err.message },
      { status: 500 }
    );
  }
}
