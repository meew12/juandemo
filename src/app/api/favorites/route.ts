import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findFavoritesByUser,
  findFavorite,
  createFavorite,
  deleteFavorite,
  safeJsonParse,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const favoritesRaw = await findFavoritesByUser(session.user.id);

    const favorites = favoritesRaw.map(({ favorite, listing, seller, category }) => ({
      id: favorite.id,
      createdAt: favorite.createdAt,
      listing: listing
        ? {
            ...listing,
            images: safeJsonParse<string[]>(listing.images, []),
            thumbs: safeJsonParse<string[]>(listing.thumbs, []),
            attrs: safeJsonParse<Record<string, unknown>>(listing.attrs, {}),
            featured: listing.featured,
            seller: seller
              ? {
                  name: seller.name,
                  lastName: seller.lastName,
                  avatarInitials: seller.avatarInitials,
                  verified: seller.verified,
                }
              : null,
            category: category
              ? {
                  slug: category.slug,
                  name: category.name,
                  type: category.type,
                }
              : null,
          }
        : null,
    }));

    return NextResponse.json({ favorites });
  } catch (err: any) {
    console.error("GET /api/favorites error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { listingId } = await req.json();
    if (!listingId) {
      return NextResponse.json({ error: "listingId requerido" }, { status: 400 });
    }

    // Toggle favorite
    const existing = await findFavorite(session.user.id, listingId);

    if (existing) {
      await deleteFavorite(existing.id);
      return NextResponse.json({ favorited: false });
    } else {
      await createFavorite(session.user.id, listingId);
      return NextResponse.json({ favorited: true });
    }
  } catch (err: any) {
    console.error("POST /api/favorites error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
