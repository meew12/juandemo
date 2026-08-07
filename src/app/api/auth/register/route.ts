// ════════════════════════════════════════════════════════════
//  /api/auth/register — Registro de usuarios
//  Usa @libsql/client directo (via db-raw.ts) para evitar
//  "URL_INVALID" en Vercel serverless.
//  IMPORTANTE: las fechas se guardan como ISO strings (formato
//  SQLite DateTime) para coincidir con los datos seeded por Prisma.
// ════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, createUser } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { name, lastName, email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Email y contraseña (mín. 6 caracteres) son obligatorios" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Verificar si ya existe
    const existing = await findUserByEmail(emailLower);
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      );
    }

    // Crear usuario usando el helper de db-raw (usa ISO dates correctamente)
    const passwordHash = await bcrypt.hash(password, 10);
    const initials = ((name?.[0] || "U") + (lastName?.[0] || "")).toUpperCase();

    const user = await createUser({
      email: emailLower,
      name: name || null,
      lastName: lastName || null,
      passwordHash,
      role: "user",
      plan: "basico",
      avatarInitials: initials,
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: any) {
    console.error("Register error:", err.message);
    return NextResponse.json(
      { error: "Error interno del servidor: " + err.message },
      { status: 500 }
    );
  }
}
