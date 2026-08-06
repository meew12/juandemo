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

    const favorites = await db.favorite.findMany({
      where: { userId: session.user.id },
      include: {
        listing: {
          include: {
            seller: {
              select: { name: true, lastName: true, avatarInitials: true, verified: true },
            },
            category: { select: { slug: true, name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ favorites });
  } catch (err: any) {
    console.error("GET /api/favorites error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { listingId } = await req.json();
    if (!listingId) {
      return NextResponse.json({ error: "listingId requerido" }, { status: 400 });
    }

    // Toggle favorite
    const existing = await db.favorite.findUnique({
      where: {
        userId_listingId: { userId: session.user.id, listingId },
      },
    });

    if (existing) {
      await db.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    } else {
      await db.favorite.create({
        data: { userId: session.user.id, listingId },
      });
      return NextResponse.json({ favorited: true });
    }
  } catch (err: any) {
    console.error("POST /api/favorites error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
