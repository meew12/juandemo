export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findTransactions,
  countTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  createAuditLog,
  getUserById,
  type TransactionFilter,
} from "@/lib/db-raw";
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

    // Build filter — db-raw doesn't support OR-with-user-join for q,
    // so we fetch WITHOUT q and filter in JS after hydration.
    const filter: TransactionFilter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (from) filter.dateGte = new Date(from).toISOString();
    if (to) filter.dateLte = new Date(to).toISOString();

    // KPI counts for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartIso = monthStart.toISOString();

    const [txs, total, monthRevenueRows, monthTxCount, failedPayments, refundsCount] =
      await Promise.all([
        findTransactions(filter, { limit: pageSize, offset }),
        countTransactions(filter),
        findTransactions(
          { status: "approved", dateGte: monthStartIso },
          { limit: 10000 }
        ),
        countTransactions({ dateGte: monthStartIso }),
        countTransactions({ status: "rejected" }),
        countTransactions({ status: "refunded" }),
      ]);

    const monthRevenue = monthRevenueRows.reduce((s, t) => s + t.amount, 0);

    // Hydrate each transaction with its user (batch lookup, avoid N+1)
    const userIds = Array.from(new Set(txs.map((t) => t.userId)));
    const users = await Promise.all(userIds.map((id) => getUserById(id)));
    const userMap = new Map<string, NonNullable<(typeof users)[number]>>();
    users.forEach((u) => {
      if (u) userMap.set(u.id, u);
    });

    let transactions = txs.map((t) => {
      const u = userMap.get(t.userId);
      const userName = u
        ? [u.name, u.lastName].filter(Boolean).join(" ") || "Usuario"
        : "Usuario";
      const userEmail = u?.email || "";
      const userInitials = u?.avatarInitials || "U";
      return {
        id: t.id,
        txId: t.txId,
        concept: t.concept,
        method: t.method,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        invoiceType: t.invoiceType,
        createdAt: t.createdAt,
        user: {
          id: t.userId,
          email: userEmail,
          name: userName,
          initials: userInitials,
        },
      };
    });

    // Apply q filter in JS (after hydration) — known limitation, acceptable for admin search
    let filteredTotal = total;
    if (q) {
      const qLower = q.toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.txId.includes(q) ||
          t.concept.includes(q) ||
          t.user.name.toLowerCase().includes(qLower) ||
          t.user.email.toLowerCase().includes(qLower)
      );
      filteredTotal = transactions.length;
    }

    return NextResponse.json({
      transactions,
      total: filteredTotal,
      page,
      pageSize,
      totalPages: Math.ceil(filteredTotal / pageSize),
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
      const original = await getTransactionById(transactionId);
      if (!original) {
        return NextResponse.json(
          { error: "Transacción no encontrada" },
          { status: 404 }
        );
      }
      if (original.status !== "approved") {
        return NextResponse.json(
          { error: "Solo se pueden reembolsar transacciones aprobadas" },
          { status: 400 }
        );
      }

      await updateTransaction(transactionId, { status: "refunded" });

      // Create negative refund record
      const refund = await createTransaction({
        txId: generateTxId(),
        userId: original.userId,
        subscriptionId: original.subscriptionId ?? undefined,
        boostId: original.boostId ?? undefined,
        concept: `Reembolso — ${original.concept}`,
        method: original.method,
        amount: -Math.abs(original.amount),
        status: "refunded",
      });

      await createAuditLog({
        userId: session.user.id,
        action: "transaction_refund",
        entity: "transaction",
        entityId: transactionId,
        details: JSON.stringify({ refundId: refund.id, amount: original.amount }),
      });

      return NextResponse.json({ ok: true, refund });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/transactions error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
