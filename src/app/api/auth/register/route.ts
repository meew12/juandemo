import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, createUser, getRawClient } from "@/lib/db-raw";

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

    // ─── Verificar si ya existe (usando libsql directo) ───
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = ((name?.[0] || "U") + (lastName?.[0] || "")).toUpperCase();

    // ─── Crear usuario (usando libsql directo) ───
    const user = await createUser({
      email,
      name: name || "",
      lastName: lastName || "",
      passwordHash,
      role: "user",
      plan: "basico",
    });

    // ─── Actualizar avatarInitials por separado ───
    try {
      const client = getRawClient();
      await client.execute({
        sql: `UPDATE User SET avatarInitials = ? WHERE id = ?`,
        args: [initials, user.id],
      });
    } catch (e: any) {
      console.warn("[register] No se pudo actualizar avatarInitials:", e.message);
    }

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: any) {
    console.error("Register error:", err.message);
    return NextResponse.json(
      { error: "Error interno del servidor: " + err.message },
      { status: 500 }
    );
  }
}
