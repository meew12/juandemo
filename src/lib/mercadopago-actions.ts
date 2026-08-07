import {
  query,
  execute,
  nowISO,
  createNotification,
  updateSubscription,
  updateUser,
  updateListing,
  updateTransaction,
} from "@/lib/db-raw";

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

  // Look up transaction with subscription and boost
  const txRows = await query<Record<string, unknown>>(
    `SELECT t.*, s.id as sub_id, s.userId as sub_userId, s.plan as sub_plan,
            b.id as boost_id, b.listingId as boost_listingId, b.type as boost_type,
            b.durationDays as boost_durationDays
     FROM \`Transaction\` t
     LEFT JOIN Subscription s ON s.id = t.subscriptionId
     LEFT JOIN Boost b ON b.id = t.boostId
     WHERE t.txId = ? LIMIT 1`,
    [txId]
  );
  if (txRows.length === 0) {
    console.warn("applyTransactionUpdate: tx no encontrada", txId);
    return;
  }
  const tx = txRows[0];

  const txStatus = String(tx.status);
  const txMpPaymentId = tx.mercadopagoPaymentId ? String(tx.mercadopagoPaymentId) : null;

  if (txStatus === status && txMpPaymentId === mpPaymentId) {
    // Sin cambios — ya procesado.
    return;
  }

  // Update the transaction
  if (amount !== undefined) {
    await execute(
      `UPDATE \`Transaction\` SET status = ?, mercadopagoPaymentId = ?, amount = ?, updatedAt = ? WHERE id = ?`,
      [status, mpPaymentId, Number(amount), nowISO(), String(tx.id)]
    );
  } else {
    await execute(
      `UPDATE \`Transaction\` SET status = ?, mercadopagoPaymentId = ?, updatedAt = ? WHERE id = ?`,
      [status, mpPaymentId, nowISO(), String(tx.id)]
    );
  }

  const userId = String(tx.userId);
  const txAmount = Number(tx.amount);

  if (status === "approved") {
    if (tx.sub_id) {
      await activateSubscription(String(tx.sub_id), preapprovalId);
    }
    if (tx.boost_id) {
      await activateBoost(String(tx.boost_id), mpPaymentId);
    }
    // Notificación al usuario
    await createNotification({
      userId,
      type: "subscription",
      title: "Pago aprobado",
      body: `Tu pago de $${txAmount} fue aprobado. ¡Gracias por confiar en UMPI!`,
      link: "/?page=perfil",
    }).catch(() => {});
  } else if (status === "rejected") {
    await createNotification({
      userId,
      type: "subscription",
      title: "Pago rechazado",
      body: `Tu pago de $${txAmount} fue rechazado. Reintentá desde la sección Suscripciones.`,
      link: "/?page=suscripciones",
    }).catch(() => {});
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
  // Fetch subscription
  const rows = await query<Record<string, unknown>>(
    `SELECT id, userId, plan FROM Subscription WHERE id = ? LIMIT 1`,
    [subscriptionId]
  );
  if (rows.length === 0) return;
  const sub = rows[0];

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = nowISO();

  // Update subscription with raw SQL (to set startDate and currentPeriodEnd)
  await execute(
    `UPDATE Subscription SET status = 'active', startDate = ?, currentPeriodEnd = ?, cancelAtPeriodEnd = 0,
     ${preapprovalId ? "mercadopagoPreapprovalId = ?, " : ""}
     updatedAt = ? WHERE id = ?`,
    preapprovalId
      ? [now, periodEnd, String(preapprovalId), now, subscriptionId]
      : [now, periodEnd, now, subscriptionId]
  );

  // Actualizar el plan del usuario
  await updateUser(String(sub.userId), {
    plan: String(sub.plan),
    verified: true,
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
  // Fetch boost with listing
  const rows = await query<Record<string, unknown>>(
    `SELECT b.id, b.listingId, b.type, b.durationDays FROM Boost b WHERE b.id = ? LIMIT 1`,
    [boostId]
  );
  if (rows.length === 0) return;
  const boost = rows[0];

  const listingId = boost.listingId ? String(boost.listingId) : null;
  if (!listingId) return;

  const start = new Date();
  const end = new Date(start.getTime() + Number(boost.durationDays) * 24 * 60 * 60 * 1000);
  const boostType = String(boost.type);
  const boostLevel = boostType === "premium_destacado" ? 3 : boostType === "top" ? 2 : 1;

  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const now = nowISO();

  // Update boost
  if (mpPaymentId) {
    await execute(
      `UPDATE Boost SET status = 'active', startDate = ?, endDate = ?, mercadopagoPaymentId = ?, updatedAt = ? WHERE id = ?`,
      [startISO, endISO, mpPaymentId, now, boostId]
    );
  } else {
    await execute(
      `UPDATE Boost SET status = 'active', startDate = ?, endDate = ?, updatedAt = ? WHERE id = ?`,
      [startISO, endISO, now, boostId]
    );
  }

  // Activar featured en la publicación
  await updateListing(listingId, {
    featured: true,
    featuredUntil: endISO,
    boostLevel,
    badge: "featured",
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
