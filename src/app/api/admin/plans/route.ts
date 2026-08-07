import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findPlans,
  getPlanById,
  getPlanBySlug,
  createPlan,
  updatePlan,
  deletePlan,
  countSubscriptions,
  sumTransactionAmounts,
  createAuditLog,
} from "@/lib/db-raw";
import { slugify } from "@/lib/utils-umpi";

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

function parseFeatures(features: any): string {
  if (Array.isArray(features)) return JSON.stringify(features);
  if (typeof features === "string") {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      /* fallthrough */
    }
    // Si es string pero no JSON, dividir por saltos de línea o comas
    return JSON.stringify(
      features.split(/\n|,/).map((s) => s.trim()).filter(Boolean)
    );
  }
  return "[]";
}

function safeParseArray(v: string | null | undefined): string[] {
  if (!v) return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

// ─── GET /api/admin/plans ───
// Lista TODOS los planes (activos e inactivos) ordenados por `order`.
export async function GET() {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const plans = await findPlans();

    const parsed = plans.map((p) => ({
      ...p,
      features: safeParseArray(p.features),
    }));

    // KPIs
    const [activeSubs, totalRevenue] = await Promise.all([
      countSubscriptions({ status: "active" }),
      sumTransactionAmounts({ status: "approved" }),
    ]);

    return NextResponse.json({
      plans: parsed,
      kpis: {
        totalPlans: plans.length,
        activePlans: plans.filter((p) => p.active).length,
        activeSubs,
        totalRevenue: totalRevenue || 0,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/plans error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── POST /api/admin/plans ───
// Crea un nuevo plan de suscripción.
export async function POST(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const {
      slug,
      name,
      price,
      currency = "ARS",
      interval = "month",
      description,
      features,
      maxListings = 1,
      maxFeatured = 0,
      badgeVerified = false,
      top10Access = false,
      multiUser = 1,
      apiAccess = false,
      prioritySupport = false,
      monthlyReport = false,
      invoiceType,
      active = true,
      order = 0,
    } = body as any;

    if (!slug || !name || typeof price !== "number") {
      return NextResponse.json(
        { error: "slug, name y price (numérico) son obligatorios" },
        { status: 400 }
      );
    }

    const finalSlug = slugify(slug);
    if (!finalSlug) {
      return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
    }

    const existing = await getPlanBySlug(finalSlug);
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un plan con ese slug" },
        { status: 409 }
      );
    }

    const plan = await createPlan({
      slug: finalSlug,
      name: String(name).trim(),
      price: Number(price),
      currency,
      interval,
      description: description?.trim() || null,
      features: parseFeatures(features),
      maxListings: Number(maxListings) || 1,
      maxFeatured: Number(maxFeatured) || 0,
      badgeVerified: Boolean(badgeVerified),
      top10Access: Boolean(top10Access),
      multiUser: Number(multiUser) || 1,
      apiAccess: Boolean(apiAccess),
      prioritySupport: Boolean(prioritySupport),
      monthlyReport: Boolean(monthlyReport),
      invoiceType: invoiceType || null,
      active: Boolean(active),
      order: Number(order) || 0,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "plan_create",
      entity: "plan",
      entityId: plan.id,
      details: JSON.stringify({ slug: finalSlug, name, price }),
    });

    return NextResponse.json({
      plan: { ...plan, features: safeParseArray(plan.features) },
    });
  } catch (err: any) {
    console.error("POST /api/admin/plans error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/plans ───
// Actualiza un plan existente.
export async function PATCH(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { planId, ...updates } = body as any;

    if (!planId) {
      return NextResponse.json({ error: "Falta planId" }, { status: 400 });
    }

    const existing = await getPlanById(planId);
    if (!existing) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    const data: any = {};
    const allowedFields: Record<string, string> = {
      name: "string",
      price: "number",
      currency: "string",
      interval: "string",
      description: "string",
      maxListings: "number",
      maxFeatured: "number",
      badgeVerified: "boolean",
      top10Access: "boolean",
      multiUser: "number",
      apiAccess: "boolean",
      prioritySupport: "boolean",
      monthlyReport: "boolean",
      invoiceType: "string",
      active: "boolean",
      order: "number",
    };

    for (const [key, type] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined) {
        if (type === "number") data[key] = Number(updates[key]);
        else if (type === "boolean") data[key] = Boolean(updates[key]);
        else data[key] = String(updates[key]).trim();
        if (key === "description" && data[key] === "") data[key] = null;
        if (key === "invoiceType" && data[key] === "") data[key] = null;
      }
    }

    if (updates.slug !== undefined && updates.slug !== existing.slug) {
      const newSlug = slugify(updates.slug);
      if (!newSlug) {
        return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
      }
      const dup = await getPlanBySlug(newSlug);
      if (dup && dup.id !== planId) {
        return NextResponse.json(
          { error: "Ya existe un plan con ese slug" },
          { status: 409 }
        );
      }
      data.slug = newSlug;
    }

    if (updates.features !== undefined) {
      data.features = parseFeatures(updates.features);
    }

    const updated = await updatePlan(planId, data);

    await createAuditLog({
      userId: session.user.id,
      action: "plan_update",
      entity: "plan",
      entityId: planId,
      details: JSON.stringify(body),
    });

    return NextResponse.json({
      plan: { ...updated, features: safeParseArray(updated?.features) },
    });
  } catch (err: any) {
    console.error("PATCH /api/admin/plans error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/plans?id=xxx ───
// Elimina (desactiva) un plan. Si tiene suscripciones activas, lo desactiva en lugar de borrar.
export async function DELETE(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("id");
    if (!planId) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const existing = await getPlanById(planId);
    if (!existing) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    // Verificar suscripciones activas con este plan
    const activeSubs = await countSubscriptions({
      plan: existing.slug,
      status: "active",
    });

    if (activeSubs > 0) {
      // Desactivar en lugar de borrar
      await updatePlan(planId, { active: false });
      await createAuditLog({
        userId: session.user.id,
        action: "plan_deactivate",
        entity: "plan",
        entityId: planId,
        details: JSON.stringify({
          reason: "Tiene suscripciones activas — se desactivó en lugar de borrar",
          activeSubs,
        }),
      });
      return NextResponse.json({
        success: true,
        deactivated: true,
        message: `Plan desactivado (tenía ${activeSubs} suscripción activa). No se eliminó para preservar historial.`,
      });
    }

    // Si no hay suscripciones, eliminar permanentemente
    await deletePlan(planId);
    await createAuditLog({
      userId: session.user.id,
      action: "plan_delete",
      entity: "plan",
      entityId: planId,
      details: JSON.stringify({ slug: existing.slug, name: existing.name }),
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/plans error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
