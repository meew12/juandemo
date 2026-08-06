import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        lastName: true,
        avatarInitials: true,
        verified: true,
        plan: true,
        zone: true,
        bio: true,
        memberSince: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Fetch seller's active listings (with seller + category joined for ListingCard compatibility)
    const listings = await db.listing.findMany({
      where: {
        sellerId: id,
        status: "active",
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarInitials: true,
            verified: true,
            plan: true,
            zone: true,
            memberSince: true,
          },
        },
        category: {
          select: { id: true, slug: true, name: true, type: true },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });

    // Aggregate reviews across all the seller's listings
    const listingIds = listings.map((l) => l.id);
    const reviews = listingIds.length
      ? await db.review.findMany({
          where: {
            listingId: { in: listingIds },
            status: "active",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                avatarInitials: true,
              },
            },
            listing: {
              select: { id: true, title: true, slug: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];

    // Summary stats
    const totalListings = listings.length;
    const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10
          ) / 10
        : 0;

    return NextResponse.json({
      user,
      stats: {
        totalListings,
        totalViews,
        avgRating,
        totalReviews,
      },
      listings,
      reviews,
    });
  } catch (err: any) {
    console.error("GET /api/users/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
