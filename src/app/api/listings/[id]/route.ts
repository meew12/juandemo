import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getListingById,
  updateListing,
  deleteListing,
  getUserById,
  getCategoryById,
  safeJsonParse,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await getListingById(id);

    if (!listing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const seller = await getUserById(listing.sellerId);
    const category = listing.categoryId ? await getCategoryById(listing.categoryId) : null;

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
      },
    });
  } catch (err: any) {
    console.error("GET /api/listings/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify ownership
    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    if (listing.sellerId !== session.user.id && (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const data: any = {};
    if (body.title) data.title = body.title;
    if (body.description) data.description = body.description;
    if (body.price !== undefined) data.price = parseFloat(body.price);
    if (body.currency) data.currency = body.currency;
    if (body.priceUnit !== undefined) data.priceUnit = body.priceUnit;
    if (body.location !== undefined) data.location = body.location;
    if (body.zone !== undefined) data.zone = body.zone;
    if (body.status) data.status = body.status;
    if (body.attrs) data.attrs = JSON.stringify(body.attrs);
    if (body.images) data.images = JSON.stringify(body.images);
    // NOTE: `featured` is intentionally NOT allowed here. It can only be set
    // by the MercadoPago webhook after a boost payment is confirmed.

    const updated = await updateListing(id, data);
    return NextResponse.json({
      listing: updated
        ? {
            ...updated,
            images: safeJsonParse<string[]>(updated.images, []),
            thumbs: safeJsonParse<string[]>(updated.thumbs, []),
            attrs: safeJsonParse<Record<string, unknown>>(updated.attrs, {}),
          }
        : null,
    });
  } catch (err: any) {
    console.error("PATCH /api/listings/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    if (listing.sellerId !== session.user.id && (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    await deleteListing(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/listings/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
