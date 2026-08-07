import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findListings,
  getUserById,
  getCategoryById,
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

    const rawListings = await findListings(
      { sellerId: session.user.id },
      { limit: 1000 }
    );

    // Preserve original orderBy: { createdAt: "desc" } (no featured priority).
    const listings = [...rawListings].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Hydrate seller + category in parallel (mirrors /api/listings GET).
    const sellerIds = Array.from(new Set(listings.map((l) => l.sellerId)));
    const categoryIds = Array.from(
      new Set(
        listings.map((l) => l.categoryId).filter(Boolean) as string[]
      )
    );

    const [sellers, categories] = await Promise.all([
      Promise.all(sellerIds.map((id) => getUserById(id))),
      Promise.all(categoryIds.map((id) => getCategoryById(id))),
    ]);

    const sellerMap = new Map(sellerIds.map((id, i) => [id, sellers[i]]));
    const categoryMap = new Map(
      categoryIds.map((id, i) => [id, categories[i]])
    );

    const result = listings.map((l) => {
      const seller = sellerMap.get(l.sellerId) ?? null;
      const category = l.categoryId
        ? categoryMap.get(l.categoryId) ?? null
        : null;
      return {
        ...l,
        images: safeJsonParse<string[]>(l.images, []),
        thumbs: safeJsonParse<string[]>(l.thumbs, []),
        attrs: safeJsonParse<Record<string, unknown>>(l.attrs, {}),
        featured: l.featured,
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
              memberSince: seller.memberSince,
            }
          : null,
        category: category
          ? {
              id: category.id,
              slug: category.slug,
              name: category.name,
              type: category.type,
            }
          : null,
      };
    });

    return NextResponse.json({ listings: result });
  } catch (err: any) {
    console.error("GET /api/me/listings error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
