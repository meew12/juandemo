import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById, execute, nowISO } from "@/lib/db-raw";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const user = await getUserById(session.user.id);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Usuario sin contraseña configurada" },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    // updateUser() does not support passwordHash, so we run a raw UPDATE.
    await execute(
      "UPDATE User SET passwordHash = ?, updatedAt = ? WHERE id = ?",
      [hashed, nowISO(), session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/me/password error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
