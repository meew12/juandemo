import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById, updateUser } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await getUserById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Exclude passwordHash from the response
    const { passwordHash: _omit, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (err: any) {
    console.error("GET /api/me error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, lastName, phone, zone, bio } = body;

    const data: Parameters<typeof updateUser>[1] = {};
    if (name !== undefined) data.name = name;
    if (lastName !== undefined) data.lastName = lastName;
    if (phone !== undefined) data.phone = phone;
    if (zone !== undefined) data.zone = zone;
    if (bio !== undefined) data.bio = bio;
    if (name && lastName) {
      data.avatarInitials = (name[0] + lastName[0]).toUpperCase();
    }

    const updated = await updateUser(session.user.id, data);
    if (!updated) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Exclude passwordHash
    const { passwordHash: _omit, ...safeUser } = updated;

    return NextResponse.json({ user: safeUser });
  } catch (err: any) {
    console.error("PATCH /api/me error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
