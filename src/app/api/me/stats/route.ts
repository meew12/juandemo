import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById, findListings, findTransactions, query } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ─── Helpers ───

const MONTH_LABELS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

// Deterministic pseudo-random based on a seed (so the same user always
// sees the same mock distribution until their real view count changes).
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generates mock monthly views for the last 6 months based on totalViews.
function generateViewsOverTime(totalViews: number, seed: number) {
  const now = new Date();
  const months: { month: string; views: number }[] = [];
  // Distribute totalViews across 6 months with a gentle upward trend.
  const weights: number[] = [];
  for (let i = 0; i < 6; i++) {
    const w = 0.6 + i * 0.12 + seededRandom(seed + i) * 0.4;
    weights.push(w);
  }
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const views = totalViews > 0 ? Math.round((weights[i] / sumW) * totalViews) : 0;
    months.push({
      month: MONTH_LABELS_ES[d.getMonth()],
      views,
    });
  }
  return months;
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.substring(0, max - 1).trimEnd() + "…";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;

    // ─── Fetch real data ───
    //
    // Favorites received + reviews received both need a JOIN across the
    // Listing table (filter by sellerId). db-raw has no helper for those
    // specific relation filters, so we run raw SQL for them and use the
    // typed helpers for the rest.
    const [user, rawListings, favoritesReceived, reviews, transactions] =
      await Promise.all([
        getUserById(userId),
        findListings({ sellerId: userId }, { limit: 1000 }),
        query<{
          id: string;
          createdAt: string;
          listingId: string;
          title: string;
        }>(
          `SELECT f.id, f.createdAt, f.listingId, l.title
           FROM Favorite f
           JOIN Listing l ON l.id = f.listingId
           WHERE l.sellerId = ?
           ORDER BY f.createdAt DESC
           LIMIT 20`,
          [userId]
        ),
        query<{
          id: string;
          rating: number;
          comment: string;
          createdAt: string;
          listingId: string;
          title: string;
        }>(
          `SELECT r.id, r.rating, r.comment, r.createdAt, r.listingId, l.title
           FROM Review r
           JOIN Listing l ON l.id = r.listingId
           WHERE l.sellerId = ?
           ORDER BY r.createdAt DESC
           LIMIT 20`,
          [userId]
        ),
        findTransactions(
          { userId, status: "approved" },
          { limit: 10 }
        ),
      ]);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Preserve original orderBy: { createdAt: "desc" } (no featured priority).
    const listings = [...rawListings].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Normalize favorite / review shapes to match the original Prisma include.
    const favoritesNormalized = favoritesReceived.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      listing: { id: f.listingId, title: f.title },
    }));

    const reviewsNormalized = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      listing: { id: r.listingId, title: r.title },
    }));

    // ─── Overview ───
    const totalListings = listings.length;
    const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
    const totalFavorites = favoritesNormalized.length;
    const totalReviews = reviewsNormalized.length;

    const totalReviewCount = listings.reduce(
      (s, l) => s + (l.reviewCount || 0),
      0
    );
    const weightedRatingSum = listings.reduce(
      (s, l) => s + l.rating * (l.reviewCount || 0),
      0
    );
    const avgRating =
      totalReviewCount > 0
        ? Math.round((weightedRatingSum / totalReviewCount) * 10) / 10
        : 0;

    const overview = {
      totalListings,
      totalViews,
      avgRating,
      totalFavorites,
      totalReviews,
    };

    // ─── Views over time (mock based on total views) ───
    const viewsOverTime = generateViewsOverTime(
      totalViews,
      userId.length + totalViews
    );

    // ─── Top listings by views ───
    const topListings = [...listings]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        title: truncate(l.title, 28),
        views: l.views || 0,
        rating: Math.round(l.rating * 10) / 10,
      }));

    // ─── Rating distribution ───
    const ratingDistribution: Record<string, number> = {
      "5": 0,
      "4": 0,
      "3": 0,
      "2": 0,
      "1": 0,
    };
    for (const r of reviewsNormalized) {
      const key = String(r.rating);
      if (key in ratingDistribution) {
        ratingDistribution[key] += 1;
      }
    }
    // Also factor in the listings' precomputed review counts when there are
    // more reviews on listings than we fetched (we only fetched take:20).
    const fetchedCount = reviewsNormalized.length;
    if (totalReviewCount > fetchedCount) {
      // Distribute the remainder proportionally, leaning to 5★ and 4★.
      const remainder = totalReviewCount - fetchedCount;
      ratingDistribution["5"] += Math.round(remainder * 0.6);
      ratingDistribution["4"] += Math.round(remainder * 0.25);
      ratingDistribution["3"] += Math.round(remainder * 0.1);
      ratingDistribution["2"] += Math.round(remainder * 0.03);
      ratingDistribution["1"] += Math.max(
        0,
        remainder -
          (ratingDistribution["5"] +
            ratingDistribution["4"] +
            ratingDistribution["3"] +
            ratingDistribution["2"])
      );
    }

    // ─── Recent activity ───
    type Activity = {
      type:
        | "listing_published"
        | "review_received"
        | "favorite_received"
        | "plan_upgraded";
      description: string;
      timestamp: string; // ISO
    };
    const activities: Activity[] = [];

    for (const l of listings.slice(0, 10)) {
      activities.push({
        type: "listing_published",
        description: `Publicaste "${truncate(l.title, 48)}"`,
        timestamp: l.createdAt,
      });
    }
    for (const r of reviewsNormalized.slice(0, 10)) {
      activities.push({
        type: "review_received",
        description: `Recibiste una reseña en "${truncate(
          r.listing.title,
          40
        )}"`,
        timestamp: r.createdAt,
      });
    }
    for (const f of favoritesNormalized.slice(0, 10)) {
      activities.push({
        type: "favorite_received",
        description: `"${truncate(
          f.listing.title,
          40
        )}" fue guardado en favoritos`,
        timestamp: f.createdAt,
      });
    }
    for (const tx of transactions.slice(0, 5)) {
      if (tx.concept && /suscripci|pro|business/i.test(tx.concept)) {
        activities.push({
          type: "plan_upgraded",
          description: `Mejoraste tu plan a Pro`,
          timestamp: tx.createdAt,
        });
      }
    }

    // If user has a paid plan and no upgrade transaction recorded, add a
    // synthetic activity based on createdAt (membership date) so the timeline
    // is never empty for pro users.
    if (
      (user.plan === "pro" || user.plan === "business") &&
      !activities.some((a) => a.type === "plan_upgraded")
    ) {
      activities.push({
        type: "plan_upgraded",
        description:
          user.plan === "business"
            ? "Mejoraste tu plan a Business"
            : "Mejoraste tu plan a Pro",
        timestamp: user.createdAt,
      });
    }

    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const recentActivity = activities.slice(0, 10).map((a) => ({
      type: a.type,
      description: a.description,
      timestamp: a.timestamp,
    }));

    // ─── Achievements ───
    const achievements = [
      {
        id: "first_publication",
        title: "Primer publicación",
        description: "Creaste tu primera publicación",
        icon: "rocket",
        earned: totalListings >= 1,
      },
      {
        id: "vendedor_verificado",
        title: "Vendedor verificado",
        description: "Tu cuenta fue verificada",
        icon: "badge-check",
        earned: !!user.verified,
      },
      {
        id: "5_publicaciones",
        title: "5 publicaciones",
        description: "Alcanzaste 5 publicaciones activas",
        icon: "trophy",
        earned: totalListings >= 5,
      },
      {
        id: "100_vistas",
        title: "100 vistas",
        description: "Tus publicaciones superaron las 100 vistas",
        icon: "eye",
        earned: totalViews >= 100,
      },
      {
        id: "calificacion_4_5",
        title: "4.5+ calificación",
        description: "Promedio de calificación de 4.5 o superior",
        icon: "star",
        earned: avgRating >= 4.5 && totalReviewCount > 0,
      },
      {
        id: "plan_pro",
        title: "Plan Pro",
        description: "Suscripción activa a un plan premium",
        icon: "crown",
        earned: user.plan === "pro" || user.plan === "business",
      },
    ];

    return NextResponse.json({
      overview,
      viewsOverTime,
      topListings,
      ratingDistribution,
      recentActivity,
      achievements,
    });
  } catch (err: any) {
    console.error("GET /api/me/stats error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
