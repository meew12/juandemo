import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils-umpi";
import {
  findCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  countListingsByCategory,
  countSubcategoriesByCategory,
  createAuditLog,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return null;
  }
  return session;
}

// ─── GET /api/admin/categories ───
// Lista todas las categorías con conteo de publicaciones y subcategorías.
export async function GET(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // servicio | auto | propiedad

    const filter: { type?: string } = {};
    if (type) filter.type = type;

    const categories = await findCategories(filter);

    // Adjuntar conteos en paralelo
    const enriched = await Promise.all(
      categories.map(async (cat) => {
        const [listings, subcategories] = await Promise.all([
          countListingsByCategory(cat.id),
          countSubcategoriesByCategory(cat.id),
        ]);
        return {
          ...cat,
          _count: { listings, subcategories },
        };
      })
    );

    return NextResponse.json({ categories: enriched });
  } catch (err: any) {
    console.error("GET /api/admin/categories error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── POST /api/admin/categories ───
// Crea una nueva categoría.
export async function POST(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { name, type, slug, icon, description, order } = body as {
      name: string;
      type: string; // servicio | auto | propiedad
      slug?: string;
      icon?: string;
      description?: string;
      order?: number;
    };

    if (!name || !type) {
      return NextResponse.json(
        { error: "Nombre y tipo son obligatorios" },
        { status: 400 }
      );
    }

    if (!["servicio", "auto", "propiedad"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo inválido (debe ser: servicio, auto o propiedad)" },
        { status: 400 }
      );
    }

    const finalSlug = slug ? slugify(slug) : slugify(name);
    if (!finalSlug) {
      return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
    }

    const existing = await getCategoryBySlug(finalSlug);
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese slug" },
        { status: 409 }
      );
    }

    const category = await createCategory({
      slug: finalSlug,
      name: name.trim(),
      type,
      icon: icon?.trim() || null,
      description: description?.trim() || null,
      order: typeof order === "number" ? order : 0,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "category_create",
      entity: "category",
      entityId: category.id,
      details: JSON.stringify({ name, type, slug: finalSlug }),
    });

    return NextResponse.json({ category });
  } catch (err: any) {
    console.error("POST /api/admin/categories error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/categories ───
// Actualiza una categoría existente.
export async function PATCH(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { categoryId, name, type, slug, icon, description, order } = body as {
      categoryId: string;
      name?: string;
      type?: string;
      slug?: string;
      icon?: string | null;
      description?: string | null;
      order?: number;
    };

    if (!categoryId) {
      return NextResponse.json({ error: "Falta categoryId" }, { status: 400 });
    }

    const existing = await getCategoryById(categoryId);
    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    if (type && !["servicio", "auto", "propiedad"].includes(type)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    const data: {
      slug?: string;
      name?: string;
      type?: string;
      icon?: string | null;
      description?: string | null;
      order?: number;
    } = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type;
    if (icon !== undefined) data.icon = icon?.trim() || null;
    if (description !== undefined) data.description = description?.trim() || null;
    if (order !== undefined) data.order = order;

    if (slug !== undefined && slug !== existing.slug) {
      const newSlug = slugify(slug);
      if (!newSlug) {
        return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
      }
      const dup = await getCategoryBySlug(newSlug);
      if (dup && dup.id !== categoryId) {
        return NextResponse.json(
          { error: "Ya existe una categoría con ese slug" },
          { status: 409 }
        );
      }
      data.slug = newSlug;
    }

    const updated = await updateCategory(categoryId, data);
    if (!updated) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "category_update",
      entity: "category",
      entityId: categoryId,
      details: JSON.stringify(body),
    });

    return NextResponse.json({ category: updated });
  } catch (err: any) {
    console.error("PATCH /api/admin/categories error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/categories?id=xxx ───
// Elimina una categoría. Verifica que no tenga publicaciones asociadas.
export async function DELETE(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("id");
    if (!categoryId) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const existing = await getCategoryById(categoryId);
    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const listingsCount = await countListingsByCategory(categoryId);
    if (listingsCount > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: hay ${listingsCount} publicación(es) que usan esta categoría. Reasignalas primero.`,
        },
        { status: 400 }
      );
    }

    await deleteCategory(categoryId);

    await createAuditLog({
      userId: session.user.id,
      action: "category_delete",
      entity: "category",
      entityId: categoryId,
      details: JSON.stringify({ name: existing.name, slug: existing.slug }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/categories error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
