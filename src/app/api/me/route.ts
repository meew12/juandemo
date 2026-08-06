import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        image: true,
        phone: true,
        zone: true,
        bio: true,
        avatarInitials: true,
        role: true,
        plan: true,
        verified: true,
        memberSince: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
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

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: name ?? undefined,
        lastName: lastName ?? undefined,
        phone: phone ?? undefined,
        zone: zone ?? undefined,
        bio: bio ?? undefined,
        avatarInitials:
          name && lastName
            ? (name[0] + lastName[0]).toUpperCase()
            : undefined,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    console.error("PATCH /api/me error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
