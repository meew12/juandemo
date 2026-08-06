import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const where: any = {};
    if (rating) where.rating = parseInt(rating);
    if (status) where.status = status;

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              avatarInitials: true,
            },
          },
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },
        },
      }),
      db.review.count({ where }),
    ]);

    const result = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        name: [r.user.name, r.user.lastName].filter(Boolean).join(" ") || "Usuario",
        email: r.user.email,
        initials: r.user.avatarInitials || "U",
      },
      listing: r.listing,
    }));

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

    const updated = await db.review.update({
      where: { id: reviewId },
      data: { status: newStatus },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: `review_${action}`,
        entity: "review",
        entityId: reviewId,
        details: JSON.stringify({ status: newStatus }),
      },
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

    await db.review.delete({ where: { id: reviewId } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "review_delete",
        entity: "review",
        entityId: reviewId,
        details: JSON.stringify({}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/reviews error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
