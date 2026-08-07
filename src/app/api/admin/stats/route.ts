import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  countUsers,
  countListings,
  countSubscriptions,
  countTransactions,
  countReports,
  userCountByPlan,
  listingCountByType,
  findListings,
  findTransactions,
  sumTransactionAmounts,
  getUserById,
  safeJsonParse,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStartISO = monthStart.toISOString();
    const lastMonthStartISO = lastMonthStart.toISOString();

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
      boostRevenue,
      subscriptionRevenue,
    ] = await Promise.all([
      countUsers({ banned: false }),
      countListings({ status: "active" }),
      countSubscriptions({ status: "active" }),
      countTransactions({ status: "rejected" }),
      countTransactions({ status: "refunded" }),
      findTransactions({ status: "approved", dateGte: monthStartISO }, { limit: 10000 }),
      findTransactions(
        { status: "approved", dateGte: lastMonthStartISO, dateLte: monthStartISO },
        { limit: 10000 }
      ),
      countReports({ status: "open" }),
      userCountByPlan(),
      listingCountByType(),
      findListings({}, { sort: "newest", limit: 5 }),
      sumTransactionAmounts({ status: "approved", dateGte: monthStartISO, boostId: "__not_null__" }),
      sumTransactionAmounts({ status: "approved", dateGte: monthStartISO, subscriptionId: "__not_null__" }),
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
      const rows = await findTransactions(
        { status: "approved", dateGte: start.toISOString(), dateLte: end.toISOString() },
        { limit: 10000 }
      );
      monthlySeries.push({
        label: months[start.getMonth()],
        amount: rows.reduce((s, t) => s + t.amount, 0),
      });
    }

    const planDist = planCounts.map((p) => ({ plan: p.plan, count: p.count }));
    const totalPlanCount = planDist.reduce((s, p) => s + p.count, 0) || 1;

    const catDist = categoryCounts.map((c) => ({ type: c.type, count: c.count }));
    const totalCatCount = catDist.reduce((s, c) => s + c.count, 0) || 1;

    // Hydrate recent listings with seller info
    const sellerIds = Array.from(new Set(recentListingsRaw.map((l) => l.sellerId)));
    const sellers = await Promise.all(sellerIds.map((id) => getUserById(id)));
    const sellerMap = new Map(sellerIds.map((id, i) => [id, sellers[i]]));

    const recentListings = recentListingsRaw.map((l) => {
      const seller = sellerMap.get(l.sellerId);
      return {
        id: l.id,
        title: l.title,
        slug: l.slug,
        price: l.price,
        currency: l.currency,
        status: l.status,
        views: l.views,
        featured: l.featured,
        createdAt: l.createdAt,
        seller: {
          name: [seller?.name, seller?.lastName].filter(Boolean).join(" ") || "Usuario",
          initials: seller?.avatarInitials || "U",
          verified: seller?.verified ?? false,
        },
      };
    });

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
        subscriptions: subscriptionRevenue,
        boosts: boostRevenue,
      },
      recentListings,
    });
  } catch (err: any) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
