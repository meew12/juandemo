import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getListingById, createReport } from "@/lib/db-raw";

const VALID_REASONS = [
  "Es spam o engaño",
  "Información falsa o engañosa",
  "Contenido inapropiado",
  "Otro motivo",
] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Iniciá sesión para reportar" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { listingId, reason, details } = body as {
      listingId?: string;
      reason?: string;
      details?: string;
    };

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "listingId requerido" },
        { status: 400 }
      );
    }

    if (!reason || !VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
      return NextResponse.json(
        { error: "Motivo inválido" },
        { status: 400 }
      );
    }

    // Verify listing exists
    const listing = await getListingById(listingId);
    if (!listing) {
      return NextResponse.json(
        { error: "Publicación no encontrada" },
        { status: 404 }
      );
    }

    // Don't allow reporting own listing
    if (listing.sellerId === session.user.id) {
      return NextResponse.json(
        { error: "No podés reportar tu propia publicación" },
        { status: 400 }
      );
    }

    const sanitizedDetails =
      typeof details === "string" ? details.trim().slice(0, 2000) : null;

    const report = await createReport({
      reporterId: session.user.id,
      listingId: listing.id,
      reportedUserId: listing.sellerId,
      reason,
      description: sanitizedDetails || null,
    });

    return NextResponse.json({ report });
  } catch (err: any) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
