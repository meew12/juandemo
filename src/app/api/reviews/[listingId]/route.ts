import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findReviews,
  createReview,
  getListingById,
  getUserById,
  createNotification,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const reviews = await findReviews(
      { listingId, status: "active" },
      { limit: 200, orderBy: "createdAt DESC" }
    );

    // Hydrate users
    const userIds = Array.from(new Set(reviews.map((r) => r.userId)));
    const users = await Promise.all(userIds.map((id) => getUserById(id)));
    const userMap = new Map(userIds.map((id, i) => [id, users[i]]));

    const result = reviews.map((r) => {
      const u = userMap.get(r.userId);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
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

    return NextResponse.json({ reviews: result });
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
    const listing = await getListingById(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    // Can't review own listing
    if (listing.sellerId === session.user.id) {
      return NextResponse.json({ error: "No podés reseñar tu propia publicación" }, { status: 400 });
    }

    // Create review (createReview checks for duplicates and recalculates rating)
    let review;
    try {
      review = await createReview({
        listingId,
        userId: session.user.id,
        rating,
        comment: comment.trim(),
      });
    } catch (e: any) {
      if (e.message === "ALREADY_REVIEWED") {
        return NextResponse.json(
          { error: "Ya reseñaste esta publicación" },
          { status: 400 }
        );
      }
      throw e;
    }

    // Hydrate review user
    const user = await getUserById(session.user.id);
    const reviewWithUser = {
      ...review,
      user: user
        ? {
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            avatarInitials: user.avatarInitials,
          }
        : null,
    };

    // Notify the listing owner about the new review
    if (listing.sellerId !== session.user.id) {
      const userName =
        [session.user.name].filter(Boolean).join(" ") || "Un usuario";
      createNotification({
        userId: listing.sellerId,
        type: "review",
        title: "Nueva reseña recibida ⭐",
        body: `${userName} dejó una reseña de ${rating}★ en "${listing.title}"`,
        link: `/?page=detail&slug=${listing.slug}`,
      }).catch(() => {});
    }

    return NextResponse.json({ review: reviewWithUser });
  } catch (err: any) {
    console.error("POST /api/reviews error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
