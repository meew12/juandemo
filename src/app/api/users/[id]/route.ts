import { NextResponse } from "next/server";
import {
  getUserById,
  findListings,
  getCategoryById,
  safeJsonParse,
  query,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface SellerReviewRow {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  userId: string;
  listingId: string;
  uName: string | null;
  uLastName: string | null;
  uAvatarInitials: string | null;
  lTitle: string;
  lSlug: string;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Public user shape — excludes passwordHash and other sensitive fields.
    const userPublic = {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      avatarInitials: user.avatarInitials,
      verified: user.verified,
      plan: user.plan,
      zone: user.zone,
      bio: user.bio,
      memberSince: user.memberSince,
      createdAt: user.createdAt,
    };

    // Fetch seller's active listings.
    // Original Prisma orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
    // which matches the db-raw "newest" sort (featured DESC, createdAt DESC).
    const rawListings = await findListings(
      { sellerId: id, status: "active" },
      { sort: "newest", limit: 1000 }
    );

    // Hydrate category in parallel (seller is the user themselves, already loaded)
    const categoryIds = Array.from(
      new Set(
        rawListings.map((l) => l.categoryId).filter(Boolean) as string[]
      )
    );
    const categories = await Promise.all(
      categoryIds.map((cid) => getCategoryById(cid))
    );
    const categoryMap = new Map(
      categoryIds.map((cid, i) => [cid, categories[i]])
    );

    const sellerPublic = {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      avatarInitials: user.avatarInitials,
      verified: user.verified,
      plan: user.plan,
      phone: user.phone,
      zone: user.zone,
      memberSince: user.memberSince,
    };

    const listings = rawListings.map((l) => {
      const category = l.categoryId
        ? categoryMap.get(l.categoryId) ?? null
        : null;
      return {
        ...l,
        images: safeJsonParse<string[]>(l.images, []),
        thumbs: safeJsonParse<string[]>(l.thumbs, []),
        attrs: safeJsonParse<Record<string, unknown>>(l.attrs, {}),
        seller: sellerPublic,
        category: category
          ? {
              id: category.id,
              slug: category.slug,
              name: category.name,
              type: category.type,
            }
          : null,
      };
    });

    // Aggregate reviews across all the seller's listings (status = 'active').
    // db-raw's findReviews only accepts a single listingId/userId filter, so we
    // use raw SQL with an IN clause + INNER JOINs to fetch user + listing data
    // in a single query (mirrors the me/stats migration pattern).
    const listingIds = rawListings.map((l) => l.id);
    let reviews: Array<{
      id: string;
      rating: number;
      comment: string;
      createdAt: string;
      userId: string;
      listingId: string;
      user: {
        id: string;
        name: string | null;
        lastName: string | null;
        avatarInitials: string | null;
      };
      listing: { id: string; title: string; slug: string };
    }> = [];

    if (listingIds.length > 0) {
      const placeholders = listingIds.map(() => "?").join(",");
      const reviewRows = await query<SellerReviewRow>(
        `SELECT r.id, r.rating, r.comment, r.createdAt, r.userId, r.listingId,
                u.name AS uName, u.lastName AS uLastName, u.avatarInitials AS uAvatarInitials,
                l.title AS lTitle, l.slug AS lSlug
         FROM Review r
         INNER JOIN User u ON u.id = r.userId
         INNER JOIN Listing l ON l.id = r.listingId
         WHERE r.listingId IN (${placeholders}) AND r.status = 'active'
         ORDER BY r.createdAt DESC
         LIMIT 50`,
        listingIds
      );
      reviews = reviewRows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        userId: r.userId,
        listingId: r.listingId,
        user: {
          id: r.userId,
          name: r.uName,
          lastName: r.uLastName,
          avatarInitials: r.uAvatarInitials,
        },
        listing: {
          id: r.listingId,
          title: r.lTitle,
          slug: r.lSlug,
        },
      }));
    }

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
      user: userPublic,
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
