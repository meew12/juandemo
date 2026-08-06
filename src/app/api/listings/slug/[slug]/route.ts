import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const listing = await db.listing.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarInitials: true,
            verified: true,
            plan: true,
            phone: true,
            zone: true,
            bio: true,
            memberSince: true,
          },
        },
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                avatarInitials: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    // Increment views (fire and forget, no await)
    db.listing
      .update({ where: { id: listing.id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    return NextResponse.json({ listing });
  } catch (err: any) {
    console.error("GET /api/listings/slug error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
