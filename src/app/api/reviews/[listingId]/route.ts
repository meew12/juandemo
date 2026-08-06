import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const reviews = await db.review.findMany({
      where: { listingId, status: "active" },
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
    });

    return NextResponse.json({ reviews });
  } catch (err: any) {
    console.error("GET /api/reviews error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { listingId } = await params;
    const { rating, comment } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Calificación inválida" }, { status: 400 });
    }
    if (!comment || comment.trim().length < 5) {
      return NextResponse.json({ error: "El comentario es muy corto" }, { status: 400 });
    }

    // Check listing exists
    const listing = await db.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    // Can't review own listing
    if (listing.sellerId === session.user.id) {
      return NextResponse.json({ error: "No podés reseñar tu propia publicación" }, { status: 400 });
    }

    // Check if already reviewed
    const existing = await db.review.findUnique({
      where: {
        listingId_userId: { listingId, userId: session.user.id },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya reseñaste esta publicación" }, { status: 400 });
    }

    const review = await db.review.create({
      data: {
        listingId,
        userId: session.user.id,
        rating,
        comment: comment.trim(),
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
      },
    });

    // Update listing rating + count
    const allReviews = await db.review.findMany({
      where: { listingId },
      select: { rating: true },
    });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await db.listing.update({
      where: { id: listingId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: allReviews.length,
      },
    });

    // Notify the listing owner about the new review
    if (listing.sellerId !== session.user.id) {
      await db.notification.create({
        data: {
          userId: listing.sellerId,
          type: "review",
          title: "Nueva reseña recibida ⭐",
          body: `${session.user.name || "Un usuario"} dejó una reseña de ${rating}★ en "${listing.title}"`,
          link: `/?page=detail&slug=${listing.slug}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ review });
  } catch (err: any) {
    console.error("POST /api/reviews error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
