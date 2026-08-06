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
        verified: true,
        plan: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Get all listings for this seller to compute average rating
    const listings = await db.listing.findMany({
      where: { sellerId: id, status: "active" },
      select: { rating: true, reviewCount: true },
    });

    // Weighted average rating across all listings
    const totalReviewWeight = listings.reduce(
      (sum, l) => sum + l.reviewCount,
      0
    );
    const weightedRatingSum = listings.reduce(
      (sum, l) => sum + l.rating * l.reviewCount,
      0
    );
    const avgRating =
      totalReviewWeight > 0 ? weightedRatingSum / totalReviewWeight : 0;

    // ── Score breakdown (total = 100) ──

    // 1. Rating score — 40% of total
    //    avgRating 0→0, 5→40
    const ratingScore = Math.round((avgRating / 5) * 40);

    // 2. Verified score — 15% of total
    const verifiedScore = user.verified ? 15 : 0;

    // 3. Plan score — 15% of total
    const planScoreMap: Record<string, number> = {
      basico: 0,
      pro: 10,
      business: 15,
    };
    const planScore = planScoreMap[user.plan] ?? 0;

    // 4. Reviews score — 15% of total
    //    0 reviews → 0, 5+ reviews → 15 (linear scale)
    const reviewScore = Math.min(15, Math.round((totalReviewWeight / 5) * 15));

    // 5. Account age score — 15% of total
    //    0 months → 0, 12+ months → 15 (linear scale)
    const monthsSinceCreation =
      (Date.now() - new Date(user.createdAt).getTime()) /
      (1000 * 60 * 60 * 24 * 30);
    const ageScore = Math.min(15, Math.round((monthsSinceCreation / 12) * 15));

    const totalScore = ratingScore + verifiedScore + planScore + reviewScore + ageScore;

    // Determine level
    let level: string;
    if (totalScore >= 81) level = "Premium";
    else if (totalScore >= 61) level = "Destacado";
    else if (totalScore >= 31) level = "Confiable";
    else level = "Nuevo";

    return NextResponse.json({
      score: totalScore,
      level,
      breakdown: {
        rating: ratingScore,
        verified: verifiedScore,
        plan: planScore,
        reviews: reviewScore,
        age: ageScore,
      },
    });
  } catch (err: any) {
    console.error("GET /api/users/[id]/reputation error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
