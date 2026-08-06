import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, lastName, email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Email y contraseña (mín. 6 caracteres) son obligatorios" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = ((name?.[0] || "U") + (lastName?.[0] || "")).toUpperCase();

    await db.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || "",
        lastName: lastName || "",
        passwordHash,
        role: "user",
        plan: "basico",
        verified: false,
        avatarInitials: initials,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
