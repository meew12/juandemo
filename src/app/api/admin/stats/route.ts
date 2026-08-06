import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      activeListings,
      activeSubscriptions,
      failedPayments,
      refundsCount,
      monthRevenueRows,
      lastMonthRevenueRows,
      pendingReports,
      planCounts,
      categoryCounts,
      recentListingsRaw,
      boostRevenueRows,
      subscriptionRevenueRows,
    ] = await Promise.all([
      db.user.count({ where: { banned: false } }),
      db.listing.count({ where: { status: "active" } }),
      db.subscription.count({ where: { status: "active" } }),
      db.transaction.count({ where: { status: "rejected" } }),
      db.transaction.count({ where: { status: "refunded" } }),
      db.transaction.findMany({
        where: {
          status: "approved",
          createdAt: { gte: monthStart },
        },
        select: { amount: true },
      }),
      db.transaction.findMany({
        where: {
          status: "approved",
          createdAt: { gte: lastMonthStart, lt: monthStart },
        },
        select: { amount: true },
      }),
      db.report.count({ where: { status: "open" } }),
      db.user.groupBy({
        by: ["plan"],
        _count: { _all: true },
      }),
      db.listing.groupBy({
        by: ["categoryType"],
        _count: { _all: true },
      }),
      db.listing.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              lastName: true,
              avatarInitials: true,
              verified: true,
            },
          },
        },
      }),
      db.transaction.aggregate({
        where: {
          status: "approved",
          createdAt: { gte: monthStart },
          boostId: { not: null },
        },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: {
          status: "approved",
          createdAt: { gte: monthStart },
          subscriptionId: { not: null },
        },
        _sum: { amount: true },
      }),
    ]);

    const monthRevenue = monthRevenueRows.reduce((s, t) => s + t.amount, 0);
    const lastMonthRevenue = lastMonthRevenueRows.reduce((s, t) => s + t.amount, 0);
    const revenueTrend =
      lastMonthRevenue > 0
        ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 100;

    // Build monthly revenue series (6 months)
    const monthlySeries: { label: string; amount: number }[] = [];
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const rows = await db.transaction.findMany({
        where: { status: "approved", createdAt: { gte: start, lt: end } },
        select: { amount: true },
      });
      monthlySeries.push({
        label: months[start.getMonth()],
        amount: rows.reduce((s, t) => s + t.amount, 0),
      });
    }

    const planDist = planCounts.map((p) => ({
      plan: p.plan,
      count: p._count._all,
    }));
    const totalPlanCount = planDist.reduce((s, p) => s + p.count, 0) || 1;

    const catDist = categoryCounts.map((c) => ({
      type: c.categoryType,
      count: c._count._all,
    }));
    const totalCatCount = catDist.reduce((s, c) => s + c.count, 0) || 1;

    const recentListings = recentListingsRaw.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      price: l.price,
      currency: l.currency,
      status: l.status,
      views: l.views,
      featured: l.featured,
      createdAt: l.createdAt.toISOString(),
      seller: {
        name: [l.seller.name, l.seller.lastName].filter(Boolean).join(" ") || "Usuario",
        initials: l.seller.avatarInitials || "U",
        verified: l.seller.verified,
      },
    }));

    return NextResponse.json({
      kpis: {
        totalUsers,
        activeListings,
        monthRevenue,
        revenueTrend,
        activeSubscriptions,
        failedPayments,
        refundsCount,
        pendingReports,
      },
      planDistribution: planDist.map((p) => ({
        ...p,
        pct: Math.round((p.count / totalPlanCount) * 1000) / 10,
      })),
      categoryDistribution: catDist.map((c) => ({
        ...c,
        pct: Math.round((c.count / totalCatCount) * 1000) / 10,
      })),
      monthlySeries,
      revenueBySource: {
        subscriptions: subscriptionRevenueRows._sum.amount || 0,
        boosts: boostRevenueRows._sum.amount || 0,
      },
      recentListings,
    });
  } catch (err: any) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
