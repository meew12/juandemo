import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify, safeJsonParse } from "@/lib/utils-umpi";

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
    const verifiedOnly = searchParams.get("verifiedOnly");
    const withPhoto = searchParams.get("withPhoto");
    const featuredOnly = searchParams.get("featuredOnly");
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
    // Prisma + SQLite (JSON column), so we have to fetch and filter in JS.
    // When any of these is active we drop take/skip from the Prisma query
    // and apply pagination AFTER filtering, otherwise pagination would be
    // broken (Prisma's take would return N rows but JS filter would drop
    // some of them, giving inconsistent page sizes).
    const hasAttrFilters = !!(
      minYear ||
      maxYear ||
      minKm ||
      maxKm ||
      (rooms && rooms !== "all") ||
      (operation && operation !== "all")
    );

    const where: any = { status: "active" };
    if (ids) {
      const idArray = ids.split(",").filter(Boolean);
      where.id = { in: idArray };
    }
    if (type) where.categoryType = type;
    if (categorySlug) {
      // Support both slug and categoryId (cuid starts with "c")
      if (categorySlug.startsWith("c")) {
        where.categoryId = categorySlug;
      } else {
        where.category = { slug: categorySlug };
      }
    }
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { location: { contains: q } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (zone && zone !== "all") {
      where.OR = [
        { zone: { contains: zone } },
        { province: { contains: zone } },
        { location: { contains: zone } },
      ];
    }
    if (minRating) where.rating = { gte: parseFloat(minRating) };
    if (featured === "true") where.featured = true;
    if (featuredOnly === "true") where.featured = true;
    if (verifiedOnly === "true") {
      where.seller = { ...(where.seller || {}), verified: true };
    }
    if (withPhoto === "true") {
      where.images = { not: "" };
      where.NOT = { ...(where.NOT || {}), images: "[]" };
    }

    let orderBy: any = [
      { featured: "desc" },
      { boostLevel: "desc" },
      { createdAt: "desc" },
    ];
    if (sort === "price_asc") orderBy = [{ featured: "desc" }, { price: "asc" }];
    if (sort === "price_desc") orderBy = [{ featured: "desc" }, { price: "desc" }];
    if (sort === "rating") orderBy = [{ featured: "desc" }, { rating: "desc" }];
    if (sort === "newest") orderBy = [{ featured: "desc" }, { createdAt: "desc" }];
    if (sort === "views") orderBy = [{ featured: "desc" }, { views: "desc" }];

    const [rawListings, total] = await Promise.all([
      db.listing.findMany({
        where,
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
              memberSince: true,
            },
          },
          category: { select: { id: true, slug: true, name: true, type: true } },
        },
        orderBy,
        ...(hasAttrFilters ? {} : { take: limit, skip: offset }),
      }),
      db.listing.count({ where }),
    ]);

    // ── Post-fetch filtering on the JSON `attrs` field ────────────────────
    // SQLite (our dev DB) can't run JSON-path predicates via Prisma, so we
    // do it in JS. We only run this branch when one of the attr filters is
    // active (otherwise `rawListings` is already paginated correctly).
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

    return NextResponse.json({
      listings,
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

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    const plan = user?.plan || "basico";
    const maxListings = plan === "basico" ? 1 : plan === "pro" ? 5 : 9999;
    const activeCount = await db.listing.count({
      where: { sellerId: session.user.id, status: "active" },
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
    const listing = await db.listing.create({
      data: {
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
      },
    });

    return NextResponse.json({
      listing,
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
