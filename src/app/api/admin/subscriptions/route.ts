import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findSubscriptions,
  countSubscriptions,
  subscriptionCountByPlan,
  updateSubscription,
  findListings,
  createAuditLog,
  getUserById,
  type UserRow,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

    const filter: { plan?: string; status?: string } = {};
    if (plan) filter.plan = plan;
    if (status) filter.status = status;

    // Fetch subs + total + plan counts in parallel
    const [subs, total, planCountsRaw] = await Promise.all([
      findSubscriptions(filter, { limit: pageSize, offset }),
      countSubscriptions(filter),
      subscriptionCountByPlan(),
    ]);

    // KPI counts (active subs per plan)
    const [basicoCount, proCount, businessCount] = await Promise.all([
      countSubscriptions({ plan: "basico", status: "active" }),
      countSubscriptions({ plan: "pro", status: "active" }),
      countSubscriptions({ plan: "business", status: "active" }),
    ]);

    // Top 10 featured listings for current week (featured=true, boostLevel>=2, active)
    const top10Raw = await findListings(
      { featured: true, boostLevelGte: 2, status: "active" },
      { sort: "views", limit: 10 }
    );

    // Batch fetch users for both subs and top10 listings
    const userIds = new Set<string>();
    for (const s of subs) userIds.add(s.userId);
    for (const l of top10Raw) userIds.add(l.sellerId);

    const userEntries = await Promise.all(
      Array.from(userIds).map(async (id) => [id, await getUserById(id)] as const)
    );
    const userMap = new Map<string, UserRow | null>();
    for (const [id, user] of userEntries) {
      userMap.set(id, user);
    }

    const subscribers = subs.map((s) => {
      const u = userMap.get(s.userId) ?? null;
      const name = u
        ? [u.name, u.lastName].filter(Boolean).join(" ") || "Usuario"
        : "Usuario";
      return {
        id: s.id,
        plan: s.plan,
        status: s.status,
        amount: s.amount,
        startDate: s.startDate,
        currentPeriodEnd: s.currentPeriodEnd,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        mercadopagoId: s.mercadopagoId,
        createdAt: s.createdAt,
        user: {
          id: u?.id ?? s.userId,
          name,
          email: u?.email ?? "",
          initials: u?.avatarInitials || "U",
        },
      };
    });

    const totalSubs = planCountsRaw.reduce((sum, p) => sum + p.count, 0) || 1;
    const planDistribution = planCountsRaw.map((p) => ({
      plan: p.plan,
      count: p.count,
      pct: Math.round((p.count / totalSubs) * 1000) / 10,
    }));

    const top10 = top10Raw.map((l) => {
      const seller = userMap.get(l.sellerId) ?? null;
      const sellerName = seller
        ? [seller.name, seller.lastName].filter(Boolean).join(" ") || "Usuario"
        : "Usuario";
      return {
        id: l.id,
        title: l.title,
        slug: l.slug,
        price: l.price,
        currency: l.currency,
        views: l.views,
        boostLevel: l.boostLevel,
        featuredUntil: l.featuredUntil,
        seller: {
          id: seller?.id ?? l.sellerId,
          name: sellerName,
          initials: seller?.avatarInitials || "U",
          plan: seller?.plan ?? "basico",
        },
      };
    });

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
      top10,
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
      const updated = await updateSubscription(subscriptionId, {
        status: "canceled",
        cancelAtPeriodEnd: true,
      });
      await createAuditLog({
        userId: session.user.id,
        action: "subscription_cancel",
        entity: "subscription",
        entityId: subscriptionId,
        details: JSON.stringify({ action }),
      });
      return NextResponse.json({ subscription: updated });
    }

    if (action === "reactivate") {
      const updated = await updateSubscription(subscriptionId, {
        status: "active",
        cancelAtPeriodEnd: false,
      });
      await createAuditLog({
        userId: session.user.id,
        action: "subscription_reactivate",
        entity: "subscription",
        entityId: subscriptionId,
        details: JSON.stringify({ action }),
      });
      return NextResponse.json({ subscription: updated });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/admin/subscriptions error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
