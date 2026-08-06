import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarInitials: true,
            verified: true,
            plan: true,
            phone: true,
            zone: true,
            bio: true,
            memberSince: true,
          },
        },
        category: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    return NextResponse.json({ listing });
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
    const listing = await db.listing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    if (listing.sellerId !== session.user.id && (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const allowed: any = {};
    if (body.title) allowed.title = body.title;
    if (body.description) allowed.description = body.description;
    if (body.price !== undefined) allowed.price = parseFloat(body.price);
    if (body.currency) allowed.currency = body.currency;
    if (body.priceUnit !== undefined) allowed.priceUnit = body.priceUnit;
    if (body.location !== undefined) allowed.location = body.location;
    if (body.zone !== undefined) allowed.zone = body.zone;
    if (body.status) allowed.status = body.status;
    if (body.attrs) allowed.attrs = JSON.stringify(body.attrs);
    if (body.images) allowed.images = JSON.stringify(body.images);
    // NOTE: `featured` is intentionally NOT allowed here. It can only be set
    // by the MercadoPago webhook after a boost payment is confirmed.

    const updated = await db.listing.update({
      where: { id },
      data: allowed,
    });

    return NextResponse.json({ listing: updated });
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
    const listing = await db.listing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    if (listing.sellerId !== session.user.id && (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    await db.listing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/listings/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
