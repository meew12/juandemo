import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findReviews,
  countReviews,
  updateReview,
  deleteReview,
  createAuditLog,
  getUserById,
  getListingById,
  type ReviewFilter,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rating = searchParams.get("rating");
    const status = searchParams.get("status"); // active | hidden | deleted
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));
    const offset = (page - 1) * pageSize;

    const filter: ReviewFilter = {};
    if (rating) filter.rating = parseInt(rating);
    if (status) filter.status = status;

    const [reviews, total] = await Promise.all([
      findReviews(filter, { limit: pageSize, offset, orderBy: "createdAt DESC" }),
      countReviews(filter),
    ]);

    // Batch-fetch unique users + listings in parallel (avoid N+1).
    const userIds = Array.from(new Set(reviews.map((r) => r.userId)));
    const listingIds = Array.from(new Set(reviews.map((r) => r.listingId)));

    const [userRows, listingRows] = await Promise.all([
      Promise.all(userIds.map((id) => getUserById(id))),
      Promise.all(listingIds.map((id) => getListingById(id))),
    ]);

    const userMap = new Map<string, NonNullable<Awaited<ReturnType<typeof getUserById>>>>();
    userRows.forEach((u) => {
      if (u) userMap.set(u.id, u);
    });
    const listingMap = new Map<string, NonNullable<Awaited<ReturnType<typeof getListingById>>>>();
    listingRows.forEach((l) => {
      if (l) listingMap.set(l.id, l);
    });

    const result = reviews.map((r) => {
      const user = userMap.get(r.userId);
      const listing = listingMap.get(r.listingId);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        user: {
          id: user?.id ?? r.userId,
          name: user
            ? [user.name, user.lastName].filter(Boolean).join(" ") || "Usuario"
            : "Usuario",
          email: user?.email ?? "",
          initials: user?.avatarInitials || "U",
        },
        listing: listing
          ? {
              id: listing.id,
              title: listing.title,
              slug: listing.slug,
              status: listing.status,
            }
          : null,
      };
    });

    return NextResponse.json({
      reviews: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("GET /api/admin/reviews error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { reviewId, action } = await req.json();
    if (!reviewId) {
      return NextResponse.json({ error: "Falta reviewId" }, { status: 400 });
    }

    let newStatus = "";
    if (action === "hide") newStatus = "hidden";
    else if (action === "show") newStatus = "active";
    else return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

    const updated = await updateReview(reviewId, { status: newStatus });
    if (!updated) {
      return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });
    }

    await createAuditLog({
      userId: session.user.id,
      action: `review_${action}`,
      entity: "review",
      entityId: reviewId,
      details: JSON.stringify({ status: newStatus }),
    });

    return NextResponse.json({ review: updated });
  } catch (err: any) {
    console.error("PATCH /api/admin/reviews error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("id");
    if (!reviewId) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    await deleteReview(reviewId);

    await createAuditLog({
      userId: session.user.id,
      action: "review_delete",
      entity: "review",
      entityId: reviewId,
      details: JSON.stringify({}),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/reviews error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
