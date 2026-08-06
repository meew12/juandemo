import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyTransactionUpdate } from "@/lib/mercadopago-actions";

// POST /api/mercadopago/demo-complete
// Body: { tx_id: string, status: "approved" | "pending" | "rejected" }
//
// This endpoint is used when MercadoPago is NOT configured (demo/sandbox
// mode). The Transaction (and related Subscription or Boost) was already
// created by `/api/mercadopago/create-preference` or `/api/mercadopago/boost`
// with `status: "pending"`. This endpoint simulates a payment notification
// and applies the same logic the webhook uses (via `applyTransactionUpdate`)
// to activate the Subscription/Boost.
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

    // 1. Find the Transaction by tx_id (include subscription and boost relations)
    const tx = await db.transaction.findUnique({
      where: { txId: tx_id },
      include: { subscription: true, boost: true },
    });
    if (!tx) {
      return NextResponse.json(
        { error: "Transacción no encontrada" },
        { status: 404 }
      );
    }

    // 2. Verify the transaction belongs to the authenticated user
    if (tx.userId !== session.user.id) {
      return NextResponse.json(
        { error: "La transacción no te pertenece" },
        { status: 403 }
      );
    }

    // 3. Apply the status update using the same logic the webhook uses.
    //    The mpPaymentId is set to "DEMO-<timestamp>" so it's clearly
    //    identifiable as a simulated payment in the DB / admin panel.
    const mpPaymentId = `DEMO-${Date.now()}`;
    await applyTransactionUpdate(tx_id, status, mpPaymentId);

    // 4. Determine the redirect URL based on the type + status.
    //    - Subscription → suscripciones page
    //    - Boost        → perfil page
    //    - status approved → mp_status=success
    //    - status pending  → mp_status=pending
    //    - status rejected → mp_status=failure
    const page = tx.subscriptionId ? "suscripciones" : "perfil";
    const mpStatus =
      status === "approved" ? "success" : status === "pending" ? "pending" : "failure";
    const redirect = `?page=${page}&mp_status=${mpStatus}`;

    return NextResponse.json({
      success: true,
      status,
      tx_id: tx.txId,
      type: tx.subscriptionId ? "subscription" : "boost",
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
