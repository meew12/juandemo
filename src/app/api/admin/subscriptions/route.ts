import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const plan = searchParams.get("plan");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (plan) where.plan = plan;
    if (status) where.status = status;

    const [subs, total, planCountsRaw] = await Promise.all([
      db.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              avatarInitials: true,
            },
          },
        },
      }),
      db.subscription.count({ where }),
      db.subscription.groupBy({
        by: ["plan"],
        _count: { _all: true },
      }),
    ]);

    // KPI counts
    const [basicoCount, proCount, businessCount] = await Promise.all([
      db.subscription.count({ where: { plan: "basico", status: "active" } }),
      db.subscription.count({ where: { plan: "pro", status: "active" } }),
      db.subscription.count({ where: { plan: "business", status: "active" } }),
    ]);

    // Top 10 featured listings for current week (those with featured=true and boostLevel>=2)
    const top10 = await db.listing.findMany({
      where: { featured: true, boostLevel: { gte: 2 }, status: "active" },
      orderBy: [{ boostLevel: "desc" }, { views: "desc" }],
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        currency: true,
        views: true,
        boostLevel: true,
        featuredUntil: true,
        seller: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarInitials: true,
            plan: true,
          },
        },
      },
    });

    const subscribers = subs.map((s) => ({
      id: s.id,
      plan: s.plan,
      status: s.status,
      amount: s.amount,
      startDate: s.startDate.toISOString(),
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      mercadopagoId: s.mercadopagoId,
      createdAt: s.createdAt.toISOString(),
      user: {
        id: s.user.id,
        name: [s.user.name, s.user.lastName].filter(Boolean).join(" ") || "Usuario",
        email: s.user.email,
        initials: s.user.avatarInitials || "U",
      },
    }));

    const totalSubs = planCountsRaw.reduce((s, p) => s + p._count._all, 0) || 1;
    const planDistribution = planCountsRaw.map((p) => ({
      plan: p.plan,
      count: p._count._all,
      pct: Math.round((p._count._all / totalSubs) * 1000) / 10,
    }));

    return NextResponse.json({
      subscribers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      kpis: {
        basico: basicoCount,
        pro: proCount,
        business: businessCount,
      },
      planDistribution,
      top10: top10.map((l) => ({
        ...l,
        title: l.title,
        seller: {
          id: l.seller.id,
          name: [l.seller.name, l.seller.lastName].filter(Boolean).join(" ") || "Usuario",
          initials: l.seller.avatarInitials || "U",
          plan: l.seller.plan,
        },
        featuredUntil: l.featuredUntil?.toISOString() || null,
      })),
    });
  } catch (err: any) {
    console.error("GET /api/admin/subscriptions error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { subscriptionId, action } = await req.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: "Falta subscriptionId" }, { status: 400 });
    }

    if (action === "cancel") {
      const updated = await db.subscription.update({
        where: { id: subscriptionId },
        data: { status: "canceled", cancelAtPeriodEnd: true },
      });
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "subscription_cancel",
          entity: "subscription",
          entityId: subscriptionId,
          details: JSON.stringify({ action }),
        },
      });
      return NextResponse.json({ subscription: updated });
    }

    if (action === "reactivate") {
      const updated = await db.subscription.update({
        where: { id: subscriptionId },
        data: { status: "active", cancelAtPeriodEnd: false },
      });
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "subscription_reactivate",
          entity: "subscription",
          entityId: subscriptionId,
          details: JSON.stringify({ action }),
        },
      });
      return NextResponse.json({ subscription: updated });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/admin/subscriptions error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
