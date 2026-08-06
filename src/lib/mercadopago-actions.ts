import { db } from "@/lib/db";

/**
 * Shared helpers for processing MercadoPago payment updates.
 *
 * These functions are used by:
 *  - `/api/mercadopago/webhook` (real MP IPN/webhook notifications)
 *  - `/api/mercadopago/demo-complete` (demo/sandbox mode when MP isn't configured)
 *
 * Extracted into a shared module so the activation logic (subscription +
 * boost + notification) is identical in both paths and cannot drift.
 */

/**
 * Maps a raw MP payment status string to one of our internal statuses.
 * Returns `null` for falsy input (the caller should ignore the event).
 */
export function mapPaymentStatus(status?: string): string | null {
  if (!status) return null;
  if (status === "approved") return "approved";
  if (status === "rejected" || status === "cancelled") return "rejected";
  if (status === "refunded" || status === "charged_back") return "refunded";
  return "pending"; // in_process, pending
}

/**
 * Maps a raw MP preapproval status to one of our internal statuses.
 */
export function mapPreApprovalStatus(status?: string): string | null {
  if (!status) return null;
  if (status === "authorized" || status === "active") return "approved";
  if (status === "cancelled" || status === "paused") return "rejected";
  return "pending";
}

/**
 * Applies a payment status update to an existing Transaction (looked up by
 * `txId`). Idempotent — if the transaction already has this status + paymentId,
 * nothing happens. When the status is `approved`, also activates the related
 * Subscription and/or Boost (if any) and creates a user Notification.
 *
 * Used by the webhook and the demo-complete endpoint.
 */
export async function applyTransactionUpdate(
  txId: string,
  status: string | null,
  mpPaymentId: string,
  amount?: number,
  preapprovalId?: string | number
): Promise<void> {
  if (!status) return;
  const tx = await db.transaction.findUnique({
    where: { txId },
    include: { subscription: true, boost: true },
  });
  if (!tx) {
    console.warn("applyTransactionUpdate: tx no encontrada", txId);
    return;
  }
  if (tx.status === status && tx.mercadopagoPaymentId === mpPaymentId) {
    // Sin cambios — ya procesado.
    return;
  }

  await db.transaction.update({
    where: { id: tx.id },
    data: {
      status,
      mercadopagoPaymentId: mpPaymentId,
      ...(amount ? { amount: Number(amount) } : {}),
    },
  });

  if (status === "approved") {
    if (tx.subscriptionId && tx.subscription) {
      await activateSubscription(tx.subscription.id, preapprovalId);
    }
    if (tx.boostId && tx.boost) {
      await activateBoost(tx.boost.id, mpPaymentId);
    }
    // Notificación al usuario
    await db.notification
      .create({
        data: {
          userId: tx.userId,
          type: "subscription",
          title: "Pago aprobado",
          body: `Tu pago de $${tx.amount} fue aprobado. ¡Gracias por confiar en UMPI!`,
          link: "/?page=perfil",
        },
      })
      .catch(() => {});
  } else if (status === "rejected") {
    await db.notification
      .create({
        data: {
          userId: tx.userId,
          type: "subscription",
          title: "Pago rechazado",
          body: `Tu pago de $${tx.amount} fue rechazado. Reintentá desde la sección Suscripciones.`,
          link: "/?page=suscripciones",
        },
      })
      .catch(() => {});
  }
}

/**
 * Activates a Subscription: sets status="active", startDate=now,
 * currentPeriodEnd=now+30d, updates the user's plan to match the subscription,
 * and marks the user as verified. Optionally stores the MP preapproval ID
 * (for recurring subscriptions).
 */
export async function activateSubscription(
  subscriptionId: string,
  preapprovalId?: string | number
): Promise<void> {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return;

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "active",
      startDate: new Date(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      ...(preapprovalId
        ? { mercadopagoPreapprovalId: String(preapprovalId) }
        : {}),
    },
  });

  // Actualizar el plan del usuario
  await db.user.update({
    where: { id: sub.userId },
    data: { plan: sub.plan, verified: true },
  });
}

/**
 * Activates a Boost: sets status="active", startDate=now, endDate=now+durationDays,
 * and applies the boost effects to the parent Listing (featured=true, badge, etc.).
 */
export async function activateBoost(
  boostId: string,
  mpPaymentId?: string
): Promise<void> {
  const boost = await db.boost.findUnique({
    where: { id: boostId },
    include: { listing: { select: { id: true } } },
  });
  if (!boost || !boost.listing) return;

  const start = new Date();
  const end = new Date(start.getTime() + boost.durationDays * 24 * 60 * 60 * 1000);
  const boostLevel =
    boost.type === "premium_destacado" ? 3 : boost.type === "top" ? 2 : 1;

  await db.boost.update({
    where: { id: boostId },
    data: {
      status: "active",
      startDate: start,
      endDate: end,
      ...(mpPaymentId ? { mercadopagoPaymentId: mpPaymentId } : {}),
    },
  });

  // Activar featured en la publicación
  await db.listing.update({
    where: { id: boost.listing.id },
    data: {
      featured: true,
      featuredUntil: end,
      boostLevel,
      badge: "featured",
    },
  });
}

/**
 * Detects whether a thrown error is a "MercadoPago not configured / invalid
 * token" error — i.e. a situation where demo mode should kick in instead of
 * returning a 500 to the user.
 *
 * Used by both create-preference and boost endpoints.
 */
export function isMpTokenError(err: any): boolean {
  if (!err) return false;
  const errMsg: string = err?.message || "";
  const errCode: string = err?.code || "";
  const errStatus: number = err?.status ?? 0;

  // Thrown by getMpClient() when token is missing/placeholder
  if (errMsg.includes("MERCADOPAGO_ACCESS_TOKEN") || errMsg.includes("no configurado")) {
    return true;
  }
  // MP API rejects invalid/unauthorized tokens with 401/403 or specific codes
  if (errStatus === 401 || errStatus === 403) return true;
  if (
    errCode === "PA_UNAUTHORIZED_RESULT_FROM_POLICIES" ||
    errCode === "unauthorized" ||
    errCode === "INVALID_TOKEN" ||
    errCode === "invalid_access_token"
  ) {
    return true;
  }
  // Sometimes MP SDK wraps the API error message directly
  if (
    errMsg.toLowerCase().includes("invalid access token") ||
    errMsg.toLowerCase().includes("unauthorized") ||
    errMsg.toLowerCase().includes("invalid_token")
  ) {
    return true;
  }
  return false;
}
