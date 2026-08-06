import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const reviews = await db.review.findMany({
      where: {
        rating: { gte: 4 },
        status: "active",
      },
      include: {
        user: {
          select: {
            name: true,
            lastName: true,
            avatarInitials: true,
          },
        },
        listing: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const testimonials = reviews.map((r) => {
      const userName = [r.user.name, r.user.lastName]
        .filter(Boolean)
        .join(" ") || "Usuario";

      return {
        id: r.id,
        userName,
        userInitials: r.user.avatarInitials || userName.substring(0, 2).toUpperCase(),
        rating: r.rating,
        comment: r.comment,
        listingTitle: r.listing?.title || "Servicio",
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ testimonials });
  } catch (err: any) {
    console.error("GET /api/testimonials error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
