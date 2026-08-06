import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils-umpi";

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

    const where: any = {};
    if (type) where.type = type;

    const categories = await db.category.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { listings: true, subcategories: true },
        },
      },
    });

    return NextResponse.json({ categories });
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

    const existing = await db.category.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese slug" },
        { status: 409 }
      );
    }

    const category = await db.category.create({
      data: {
        slug: finalSlug,
        name: name.trim(),
        type,
        icon: icon?.trim() || null,
        description: description?.trim() || null,
        order: typeof order === "number" ? order : 0,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "category_create",
        entity: "category",
        entityId: category.id,
        details: JSON.stringify({ name, type, slug: finalSlug }),
      },
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

    const existing = await db.category.findUnique({ where: { id: categoryId } });
    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    if (type && !["servicio", "auto", "propiedad"].includes(type)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    const data: any = {};
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
      const dup = await db.category.findUnique({ where: { slug: newSlug } });
      if (dup && dup.id !== categoryId) {
        return NextResponse.json(
          { error: "Ya existe una categoría con ese slug" },
          { status: 409 }
        );
      }
      data.slug = newSlug;
    }

    const updated = await db.category.update({
      where: { id: categoryId },
      data,
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "category_update",
        entity: "category",
        entityId: categoryId,
        details: JSON.stringify(body),
      },
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

    const existing = await db.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { listings: true, subcategories: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    if (existing._count.listings > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: hay ${existing._count.listings} publicación(es) que usan esta categoría. Reasignalas primero.`,
        },
        { status: 400 }
      );
    }

    await db.subcategory.deleteMany({ where: { categoryId } });
    await db.category.delete({ where: { id: categoryId } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "category_delete",
        entity: "category",
        entityId: categoryId,
        details: JSON.stringify({ name: existing.name, slug: existing.slug }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/categories error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
