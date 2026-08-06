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
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status"); // active | pending | paused | rejected | sold
    const categoryType = searchParams.get("categoryType"); // servicio | auto | propiedad
    const featured = searchParams.get("featured"); // "true" | "false"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "10"));
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (q) {
      where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
    }
    if (status) where.status = status;
    if (categoryType) where.categoryType = categoryType;
    if (featured === "true") where.featured = true;
    if (featured === "false") where.featured = false;

    const [listings, total] = await Promise.all([
      db.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              lastName: true,
              avatarInitials: true,
              verified: true,
            },
          },
          category: { select: { id: true, name: true, slug: true, type: true } },
        },
      }),
      db.listing.count({ where }),
    ]);

    const result = listings.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      price: l.price,
      currency: l.currency,
      categoryType: l.categoryType,
      status: l.status,
      featured: l.featured,
      boostLevel: l.boostLevel,
      views: l.views,
      rejectionReason: l.rejectionReason,
      createdAt: l.createdAt.toISOString(),
      images: l.images,
      thumbs: l.thumbs,
      category: l.category,
      seller: {
        id: l.seller.id,
        name: [l.seller.name, l.seller.lastName].filter(Boolean).join(" ") || "Usuario",
        initials: l.seller.avatarInitials || "U",
        verified: l.seller.verified,
      },
    }));

    return NextResponse.json({
      listings: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("GET /api/admin/listings error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { listingId, action, reason } = await req.json();
    if (!listingId) {
      return NextResponse.json({ error: "Falta listingId" }, { status: 400 });
    }

    const data: any = {};
    let actionLabel = "listing_update";

    if (action === "approve") {
      data.status = "active";
      data.rejectionReason = null;
      actionLabel = "listing_approve";
    } else if (action === "reject") {
      data.status = "rejected";
      data.rejectionReason = reason || "Rechazado por administración";
      actionLabel = "listing_reject";
    } else if (action === "pause") {
      data.status = "paused";
      actionLabel = "listing_pause";
    } else if (action === "resume") {
      data.status = "active";
      actionLabel = "listing_resume";
    } else if (action === "feature") {
      data.featured = true;
      data.boostLevel = Math.max(2, 2);
      data.featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      actionLabel = "listing_feature";
    } else if (action === "unfeature") {
      data.featured = false;
      data.boostLevel = 0;
      data.featuredUntil = null;
      actionLabel = "listing_unfeature";
    } else if (action === "delete") {
      await db.listing.delete({ where: { id: listingId } });
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "listing_delete",
          entity: "listing",
          entityId: listingId,
          details: JSON.stringify({ action }),
        },
      });
      return NextResponse.json({ ok: true, deleted: true });
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const updated = await db.listing.update({
      where: { id: listingId },
      data,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarInitials: true,
            verified: true,
          },
        },
        category: { select: { id: true, name: true, slug: true, type: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: actionLabel,
        entity: "listing",
        entityId: listingId,
        details: JSON.stringify({ action, reason }),
      },
    });

    return NextResponse.json({
      listing: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        seller: {
          id: updated.seller.id,
          name: [updated.seller.name, updated.seller.lastName].filter(Boolean).join(" ") || "Usuario",
          initials: updated.seller.avatarInitials || "U",
          verified: updated.seller.verified,
        },
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/admin/listings error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
