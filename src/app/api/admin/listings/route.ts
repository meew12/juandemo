import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findListings,
  countListings,
  updateListing,
  deleteListing,
  createAuditLog,
  getUserById,
  getCategoryById,
  type ListingFilter,
  type ListingUpdateInput,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Construye el payload público de un seller a partir de un UserRow. */
function buildSeller(user: {
  id: string;
  name: string | null;
  lastName: string | null;
  avatarInitials: string | null;
  verified: boolean;
} | null) {
  if (!user) {
    return { id: "", name: "Usuario", initials: "U", verified: false };
  }
  return {
    id: user.id,
    name: [user.name, user.lastName].filter(Boolean).join(" ") || "Usuario",
    initials: user.avatarInitials || "U",
    verified: user.verified,
  };
}

/** Construye el payload público de una categoría a partir de un CategoryRow. */
function buildCategory(cat: {
  id: string;
  name: string;
  slug: string;
  type: string;
} | null) {
  if (!cat) return null;
  return { id: cat.id, name: cat.name, slug: cat.slug, type: cat.type };
}

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

    const filter: ListingFilter = {};
    if (q) filter.q = q;
    if (status) filter.status = status;
    if (categoryType) filter.categoryType = categoryType;
    if (featured === "true") filter.featured = true;
    if (featured === "false") filter.featured = false;

    const [listings, total] = await Promise.all([
      findListings(filter, { sort: "newest", limit: pageSize, offset }),
      countListings(filter),
    ]);

    // ─── Hydrate sellers y categories en paralelo ───────────────
    const uniqueSellerIds = Array.from(new Set(listings.map((l) => l.sellerId)));
    const uniqueCategoryIds = Array.from(
      new Set(listings.map((l) => l.categoryId).filter((c): c is string => c !== null))
    );

    const [sellers, categories] = await Promise.all([
      Promise.all(uniqueSellerIds.map((id) => getUserById(id))),
      Promise.all(uniqueCategoryIds.map((id) => getCategoryById(id))),
    ]);

    const sellerMap = new Map<string, ReturnType<typeof buildSeller>>();
    uniqueSellerIds.forEach((id, idx) => {
      sellerMap.set(id, buildSeller(sellers[idx]));
    });

    const categoryMap = new Map<string, ReturnType<typeof buildCategory>>();
    uniqueCategoryIds.forEach((id, idx) => {
      categoryMap.set(id, buildCategory(categories[idx]));
    });

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
      createdAt: l.createdAt,
      images: l.images,
      thumbs: l.thumbs,
      category: l.categoryId ? categoryMap.get(l.categoryId) ?? null : null,
      seller: sellerMap.get(l.sellerId) ?? buildSeller(null),
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

    const data: ListingUpdateInput = {};
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
      data.boostLevel = 2;
      data.featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      actionLabel = "listing_feature";
    } else if (action === "unfeature") {
      data.featured = false;
      data.boostLevel = 0;
      data.featuredUntil = null;
      actionLabel = "listing_unfeature";
    } else if (action === "delete") {
      await deleteListing(listingId);
      await createAuditLog({
        userId: session.user.id,
        action: "listing_delete",
        entity: "listing",
        entityId: listingId,
        details: JSON.stringify({ action }),
      });
      return NextResponse.json({ ok: true, deleted: true });
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const updated = await updateListing(listingId, data);
    if (!updated) {
      return NextResponse.json({ error: "Listing no encontrado" }, { status: 404 });
    }

    // ─── Hydrate seller + category del listing actualizado ──────
    const [seller, category] = await Promise.all([
      getUserById(updated.sellerId),
      updated.categoryId ? getCategoryById(updated.categoryId) : Promise.resolve(null),
    ]);

    await createAuditLog({
      userId: session.user.id,
      action: actionLabel,
      entity: "listing",
      entityId: listingId,
      details: JSON.stringify({ action, reason }),
    });

    return NextResponse.json({
      listing: {
        ...updated,
        createdAt: updated.createdAt,
        category: buildCategory(category),
        seller: buildSeller(seller),
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/admin/listings error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
