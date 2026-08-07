import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db-raw";
import { applyTransactionUpdate } from "@/lib/mercadopago-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/mercadopago/demo-complete
// Body: { tx_id: string, status: "approved" | "pending" | "rejected" }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tx_id, status } = body as {
      tx_id?: string;
      status?: "approved" | "pending" | "rejected";
    };

    if (!tx_id || typeof tx_id !== "string") {
      return NextResponse.json({ error: "Falta tx_id" }, { status: 400 });
    }
    if (!status || !["approved", "pending", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status debe ser 'approved', 'pending' o 'rejected'" },
        { status: 400 }
      );
    }

    // 1. Find the Transaction by tx_id
    const txRows = await query<Record<string, unknown>>(
      `SELECT t.* FROM \`Transaction\` t WHERE t.txId = ? LIMIT 1`,
      [tx_id]
    );
    if (txRows.length === 0) {
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 }
      );
    }
    const tx = txRows[0];

    // 2. Verify the transaction belongs to the authenticated user
    if (String(tx.userId) !== session.user.id) {
      return NextResponse.json(
        { error: "La transacción no te pertenece" },
        { status: 403 }
      );
    }

    // 3. Apply the status update using the same logic the webhook uses.
    const mpPaymentId = `DEMO-${Date.now()}`;
    await applyTransactionUpdate(tx_id, status, mpPaymentId);

    // 4. Determine the redirect URL based on the type + status.
    const subscriptionId = tx.subscriptionId ? String(tx.subscriptionId) : null;
    const page = subscriptionId ? "suscripciones" : "perfil";
    const mpStatus =
      status === "approved" ? "success" : status === "pending" ? "pending" : "failure";
    const redirect = `?page=${page}&mp_status=${mpStatus}`;

    return NextResponse.json({
      success: true,
      status,
      tx_id: String(tx.txId),
      type: subscriptionId ? "subscription" : "boost",
      redirect,
    });
  } catch (err: any) {
    console.error("POST /api/mercadopago/demo-complete error:", err);
    return NextResponse.json(
      { error: "Error al completar el pago demo", detail: err?.message || "" },
      { status: 500 }
    );
  }
}
