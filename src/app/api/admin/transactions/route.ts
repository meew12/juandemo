import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTxId } from "@/lib/utils-umpi";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const method = searchParams.get("method");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = searchParams.get("q") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (q) {
      where.OR = [
        { txId: { contains: q } },
        { concept: { contains: q } },
        { user: { email: { contains: q } } },
        { user: { name: { contains: q } } },
      ];
    }

    const [txs, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              lastName: true,
              avatarInitials: true,
            },
          },
        },
      }),
      db.transaction.count({ where }),
    ]);

    // KPI counts for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      monthRevenueRows,
      monthTxCount,
      failedPayments,
      refundsCount,
    ] = await Promise.all([
      db.transaction.findMany({
        where: { status: "approved", createdAt: { gte: monthStart } },
        select: { amount: true },
      }),
      db.transaction.count({
        where: { createdAt: { gte: monthStart } },
      }),
      db.transaction.count({ where: { status: "rejected" } }),
      db.transaction.count({ where: { status: "refunded" } }),
    ]);

    const monthRevenue = monthRevenueRows.reduce((s, t) => s + t.amount, 0);

    const transactions = txs.map((t) => ({
      id: t.id,
      txId: t.txId,
      concept: t.concept,
      method: t.method,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      invoiceType: t.invoiceType,
      createdAt: t.createdAt.toISOString(),
      user: {
        id: t.user.id,
        email: t.user.email,
        name: [t.user.name, t.user.lastName].filter(Boolean).join(" ") || "Usuario",
        initials: t.user.avatarInitials || "U",
      },
    }));

    return NextResponse.json({
      transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      kpis: {
        monthRevenue,
        monthTxCount,
        failedPayments,
        refundsCount,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/transactions error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { transactionId, action } = await req.json();
    if (!transactionId) {
      return NextResponse.json({ error: "Falta transactionId" }, { status: 400 });
    }

    if (action === "refund") {
      const original = await db.transaction.findUnique({
        where: { id: transactionId },
      });
      if (!original) {
        return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
      }
      if (original.status !== "approved") {
        return NextResponse.json({ error: "Solo se pueden reembolsar transacciones aprobadas" }, { status: 400 });
      }

      await db.transaction.update({
        where: { id: transactionId },
        data: { status: "refunded" },
      });

      // Create negative refund record
      const refund = await db.transaction.create({
        data: {
          txId: generateTxId(),
          userId: original.userId,
          subscriptionId: original.subscriptionId,
          boostId: original.boostId,
          concept: `Reembolso — ${original.concept}`,
          method: original.method,
          amount: -Math.abs(original.amount),
          status: "refunded",
        },
      });

      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "transaction_refund",
          entity: "transaction",
          entityId: transactionId,
          details: JSON.stringify({ refundId: refund.id, amount: original.amount }),
        },
      });

      return NextResponse.json({ ok: true, refund });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/transactions error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
