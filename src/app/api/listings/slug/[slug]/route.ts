import { NextResponse } from "next/server";
import {
  getListingBySlug,
  incrementListingViews,
  getUserById,
  getCategoryById,
  findReviews,
  safeJsonParse,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const listing = await getListingBySlug(slug);

    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    // Fetch seller, category y reviews en paralelo
    const [seller, category, reviews] = await Promise.all([
      getUserById(listing.sellerId),
      listing.categoryId ? getCategoryById(listing.categoryId) : Promise.resolve(null),
      findReviews({ listingId: listing.id, status: "active" }, { limit: 50 }),
    ]);

    // Hydrate review users
    const userIds = Array.from(new Set(reviews.map((r) => r.userId)));
    const users = await Promise.all(userIds.map((id) => getUserById(id)));
    const userMap = new Map(userIds.map((id, i) => [id, users[i]]));

    const reviewsWithUsers = reviews.map((r) => {
      const u = userMap.get(r.userId);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        user: u
          ? {
              id: u.id,
              name: u.name,
              lastName: u.lastName,
              avatarInitials: u.avatarInitials,
            }
          : null,
      };
    });

    // Increment views (fire and forget, no await)
    incrementListingViews(listing.id).catch(() => {});

    return NextResponse.json({
      listing: {
        ...listing,
        images: safeJsonParse<string[]>(listing.images, []),
        thumbs: safeJsonParse<string[]>(listing.thumbs, []),
        attrs: safeJsonParse<Record<string, unknown>>(listing.attrs, {}),
        featured: listing.featured,
        seller: seller
          ? {
              id: seller.id,
              name: seller.name,
              lastName: seller.lastName,
              avatarInitials: seller.avatarInitials,
              verified: seller.verified,
              plan: seller.plan,
              phone: seller.phone,
              zone: seller.zone,
              bio: seller.bio,
              memberSince: seller.memberSince,
            }
          : null,
        category,
        reviews: reviewsWithUsers,
      },
    });
  } catch (err: any) {
    console.error("GET /api/listings/slug error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
