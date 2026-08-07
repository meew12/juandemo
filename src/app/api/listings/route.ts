import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findListings,
  countListings,
  getListingById,
  createListing,
  getUserById,
  safeJsonParse,
} from "@/lib/db-raw";
import { slugify } from "@/lib/utils-umpi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Helper: trae el seller (User) asociado a un listing
async function getSellerForListing(sellerId: string) {
  const seller = await getUserById(sellerId);
  if (!seller) return null;
  return {
    id: seller.id,
    name: seller.name,
    lastName: seller.lastName,
    avatarInitials: seller.avatarInitials,
    verified: seller.verified,
    plan: seller.plan,
    phone: seller.phone,
    zone: seller.zone,
    memberSince: seller.memberSince,
  };
}

// Helper: trae la categoría asociada a un listing
async function getCategoryForListing(categoryId: string | null) {
  if (!categoryId) return null;
  // Import ligero para evitar ciclo
  const { getCategoryById } = await import("@/lib/db-raw");
  const cat = await getCategoryById(categoryId);
  if (!cat) return null;
  return {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    type: cat.type,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const categorySlug = searchParams.get("category");
    const q = searchParams.get("q");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const zone = searchParams.get("zone");
    const minRating = searchParams.get("minRating");
    const sort = searchParams.get("sort") || "relevance";
    const featured = searchParams.get("featured");
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const withPhoto = searchParams.get("withPhoto") === "true";
    const featuredOnly = searchParams.get("featuredOnly") === "true";
    // Vehicle-specific (autos)
    const minYear = searchParams.get("minYear");
    const maxYear = searchParams.get("maxYear");
    const minKm = searchParams.get("minKm");
    const maxKm = searchParams.get("maxKm");
    // Property-specific (propiedades)
    const rooms = searchParams.get("rooms");
    const operation = searchParams.get("operation");
    const ids = searchParams.get("ids");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // attrs-based filters (year/km/rooms/operation) can't be queried with
    // SQLite (JSON column), so we fetch and filter in JS.
    const hasAttrFilters = !!(
      minYear ||
      maxYear ||
      minKm ||
      maxKm ||
      (rooms && rooms !== "all") ||
      (operation && operation !== "all")
    );

    const filter: any = { status: "active" };
    if (ids) {
      filter.ids = ids.split(",").filter(Boolean);
    }
    if (type) filter.categoryType = type;
    if (categorySlug) filter.categorySlug = categorySlug;
    if (q) filter.q = q;
    if (minPrice) filter.minPrice = parseFloat(minPrice);
    if (maxPrice) filter.maxPrice = parseFloat(maxPrice);
    if (zone && zone !== "all") filter.zone = zone;
    if (minRating) filter.minRating = parseFloat(minRating);
    if (featured === "true") filter.featured = true;
    if (featuredOnly === "true") filter.featuredOnly = true;
    if (verifiedOnly) filter.verifiedOnly = true;
    if (withPhoto) filter.withPhoto = true;

    // When attr filters are active, fetch all matching without pagination,
    // filter in JS, then paginate.
    const queryLimit = hasAttrFilters ? 10000 : limit;
    const queryOffset = hasAttrFilters ? 0 : offset;

    const [rawListings, total] = await Promise.all([
      findListings(filter, { sort, limit: queryLimit, offset: queryOffset }),
      countListings(filter),
    ]);

    // ── Post-fetch filtering on the JSON `attrs` field ────────────────────
    let listings = rawListings;
    let filteredTotal = total;
    if (hasAttrFilters) {
      listings = rawListings.filter((l) => {
        const attrs = safeJsonParse<Record<string, unknown>>(l.attrs, {});
        // Vehicle year (attrs.Año)
        if (minYear || maxYear) {
          const year = Number(attrs["Año"]);
          if (!year) return false;
          if (minYear && year < Number(minYear)) return false;
          if (maxYear && year > Number(maxYear)) return false;
        }
        // Vehicle mileage (attrs.Km)
        if (minKm || maxKm) {
          const km = Number(attrs["Km"]);
          if (Number.isNaN(km)) return false;
          if (minKm && km < Number(minKm)) return false;
          if (maxKm && km > Number(maxKm)) return false;
        }
        // Property rooms (attrs.Ambientes). "4+" matches >= 4.
        if (rooms && rooms !== "all") {
          const ambientes = Number(attrs["Ambientes"]);
          if (!ambientes) return false;
          if (rooms === "4+") {
            if (ambientes < 4) return false;
          } else if (ambientes !== Number(rooms)) {
            return false;
          }
        }
        // Property operation (attrs.Operación: "Venta" | "Alquiler")
        if (operation && operation !== "all") {
          const op = attrs["Operación"];
          if (op !== operation) return false;
        }
        return true;
      });
      filteredTotal = listings.length;
      // Apply pagination in JS now that the array is filtered.
      listings = listings.slice(offset, offset + limit);
    }

    // Hydrate sellers y categories en paralelo
    const sellerIds = Array.from(new Set(listings.map((l) => l.sellerId)));
    const categoryIds = Array.from(
      new Set(listings.map((l) => l.categoryId).filter(Boolean) as string[])
    );

    const [sellers, categories] = await Promise.all([
      Promise.all(sellerIds.map((id) => getSellerForListing(id))),
      Promise.all(categoryIds.map((id) => getCategoryForListing(id))),
    ]);

    const sellerMap = new Map(sellerIds.map((id, i) => [id, sellers[i]]));
    const categoryMap = new Map(categoryIds.map((id, i) => [id, categories[i]]));

    const result = listings.map((l) => ({
      ...l,
      images: safeJsonParse<string[]>(l.images, []),
      thumbs: safeJsonParse<string[]>(l.thumbs, []),
      attrs: safeJsonParse<Record<string, unknown>>(l.attrs, {}),
      featured: l.featured,
      seller: sellerMap.get(l.sellerId) || null,
      category: l.categoryId ? categoryMap.get(l.categoryId) : null,
    }));

    return NextResponse.json({
      listings: result,
      total: filteredTotal,
      hasMore: offset + listings.length < filteredTotal,
    });
  } catch (err: any) {
    console.error("GET /api/listings error:", err);
    return NextResponse.json({ error: "Error al obtener publicaciones" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      categoryType,
      categoryId,
      price,
      currency = "ARS",
      priceUnit,
      location,
      zone,
      province,
      images = [],
      attrs = {},
      featured = false,
    } = body;

    if (!title || !description || !categoryType || !price) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const user = await getUserById(session.user.id);
    const plan = user?.plan || "basico";
    const maxListings = plan === "basico" ? 1 : plan === "pro" ? 5 : 9999;
    const activeCount = await countListings({
      sellerId: session.user.id,
      status: "active",
    });

    if (activeCount >= maxListings) {
      return NextResponse.json(
        {
          error: `Alcanzaste el límite de ${maxListings} publicaciones activas para el plan ${plan}. Mejorá tu plan para publicar más.`,
        },
        { status: 403 }
      );
    }

    const slug = `${slugify(title)}-${Math.random().toString(36).substring(2, 7)}`;

    // IMPORTANT: We do NOT auto-activate the boost here anymore.
    // If the user checked "featured", we create the listing as NOT featured,
    // then return `pendingBoost: true` so the frontend redirects to MP checkout.
    // The boost is only activated after MP confirms the payment via webhook.
    const listing = await createListing({
      slug,
      title,
      description,
      categoryType,
      categoryId: categoryId || null,
      price: parseFloat(price),
      currency,
      priceUnit: priceUnit || null,
      location: location || null,
      zone: zone || null,
      province: province || zone || null,
      images: JSON.stringify(images),
      thumbs: JSON.stringify(images),
      attrs: JSON.stringify(attrs),
      featured: false, // Will be set to true by the webhook after payment
      featuredUntil: null,
      boostLevel: 0,
      badge: "new",
      status: "active",
      sellerId: session.user.id,
    });

    return NextResponse.json({
      listing: {
        ...listing,
        images: safeJsonParse<string[]>(listing.images, []),
        thumbs: safeJsonParse<string[]>(listing.thumbs, []),
        attrs: safeJsonParse<Record<string, unknown>>(listing.attrs, {}),
      },
      // Signal to the frontend that a boost checkout is pending
      pendingBoost: featured ? true : false,
      boostType: featured ? "destacado" : null,
      boostAmount: featured ? 4990 : 0,
    });
  } catch (err: any) {
    console.error("POST /api/listings error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
