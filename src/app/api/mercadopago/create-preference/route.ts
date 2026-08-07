import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Preference } from "mercadopago";
import { authOptions } from "@/lib/auth";
import {
  getPlanBySlug,
  getListingById,
  createBoost,
  createTransaction,
  updateSubscription,
  findSubscriptions,
  execute,
  generateCuid,
  nowISO,
  query,
} from "@/lib/db-raw";
import { generateTxId } from "@/lib/utils-umpi";
import { getMpClient, pickInitPoint, getWebhookUrl } from "@/lib/mercadopago";
import { isMpTokenError } from "@/lib/mercadopago-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Precios de boosts (ARS)
const BOOST_PRICES: Record<string, { price: number; days: number; title: string }> = {
  destacado: { price: 4990, days: 30, title: "Destacado (30 días)" },
  top: { price: 2990, days: 7, title: "Top (7 días)" },
  premium_destacado: { price: 9990, days: 30, title: "Premium Destacado (30 días + top)" },
};

// POST /api/mercadopago/create-preference
// Body: { type: "subscription" | "boost", planSlug?, listingId?, boostType? }
export async function POST(req: Request) {
  let txId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { type, planSlug, listingId, boostType } = body as {
      type: "subscription" | "boost";
      planSlug?: string;
      listingId?: string;
      boostType?: "destacado" | "top" | "premium_destacado";
    };

    if (!type || (type !== "subscription" && type !== "boost")) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    txId = generateTxId();
    const appId = process.env.NEXTAUTH_URL || "https://umpi.com.ar";
    const webhookUrl = await getWebhookUrl();

    const backUrls = {
      success: `${appId}/?page=suscripciones&mp_status=success`,
      pending: `${appId}/?page=suscripciones&mp_status=pending`,
      failure: `${appId}/?page=suscripciones&mp_status=failure`,
    };

    // ─── SUBSCRIPTION ───
    if (type === "subscription") {
      if (!planSlug) {
        return NextResponse.json({ error: "Falta planSlug" }, { status: 400 });
      }
      const plan = await getPlanBySlug(planSlug);
      if (!plan || !plan.active) {
        return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
      }
      if (plan.price <= 0) {
        return NextResponse.json(
          { error: "Este plan es gratuito, no requiere pago" },
          { status: 400 }
        );
      }

      // Cancelar suscripción activa previa (si existe)
      const existingSubs = await findSubscriptions(
        { userId: session.user.id, status: "active" },
        { limit: 1 }
      );
      if (existingSubs.length > 0) {
        await updateSubscription(existingSubs[0].id, {
          status: "canceled",
          cancelAtPeriodEnd: true,
        });
      }

      // Crear suscripción pendiente (raw SQL since createSubscription helper doesn't exist)
      const subscriptionId = generateCuid();
      const now = nowISO();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await execute(
        `INSERT INTO Subscription (id, userId, plan, status, startDate, currentPeriodEnd, cancelAtPeriodEnd, mercadopagoId, mercadopagoPreapprovalId, amount, createdAt, updatedAt)
         VALUES (?, ?, ?, 'pending', ?, ?, 0, NULL, NULL, ?, ?, ?)`,
        [subscriptionId, session.user.id, plan.slug, now, periodEnd, plan.price, now, now]
      );

      const transaction = await createTransaction({
        txId,
        userId: session.user.id,
        subscriptionId,
        concept: `Suscripción ${plan.name} — mensual`,
        method: "mercadopago",
        amount: plan.price,
        currency: plan.currency || "ARS",
        status: "pending",
        invoiceType: plan.invoiceType,
      });

      const client = await getMpClient();
      const preference = new Preference(client);

      const result = await preference.create({
        body: {
          items: [
            {
              id: plan.slug,
              title: `UMPI Premium — Plan ${plan.name}`,
              description: plan.description || `Suscripción mensual al plan ${plan.name}`,
              category_id: "services",
              quantity: 1,
              unit_price: Number(plan.price),
              currency_id: plan.currency || "ARS",
            },
          ],
          payer: { email: session.user.email },
          external_reference: txId,
          back_urls: backUrls,
          auto_return: "approved",
          binary_mode: true,
          purpose: "subscription",
          statement_descriptor: "UMPI PREMIUM",
          ...(webhookUrl ? { notification_url: webhookUrl } : {}),
          metadata: {
            tx_id: txId,
            user_id: session.user.id,
            type: "subscription",
            plan_slug: plan.slug,
            subscription_id: subscriptionId,
          },
        },
      });

      if (result.id) {
        await execute(
          `UPDATE \`Transaction\` SET mercadopagoPreferenceId = ?, updatedAt = ? WHERE id = ?`,
          [result.id, nowISO(), transaction.id]
        );
      }

      const initPoint = pickInitPoint(result);
      if (!initPoint) {
        return NextResponse.json(
          { error: "No se pudo generar el init_point de MercadoPago" },
          { status: 502 }
        );
      }

      return NextResponse.json({
        init_point: initPoint,
        preference_id: result.id,
        tx_id: txId,
      });
    }

    // ─── BOOST ───
    if (!listingId || !boostType) {
      return NextResponse.json(
        { error: "Falta listingId o boostType" },
        { status: 400 }
      );
    }
    const boostConfig = BOOST_PRICES[boostType];
    if (!boostConfig) {
      return NextResponse.json({ error: "boostType inválido" }, { status: 400 });
    }

    const listing = await getListingById(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }
    if (listing.sellerId !== session.user.id) {
      return NextResponse.json(
        { error: "No sos el dueño de esta publicación" },
        { status: 403 }
      );
    }

    const boost = await createBoost({
      listingId: listing.id,
      userId: session.user.id,
      type: boostType,
      durationDays: boostConfig.days,
      amount: boostConfig.price,
      status: "pending",
    });

    const transaction = await createTransaction({
      txId,
      userId: session.user.id,
      boostId: boost.id,
      concept: `Boost ${boostConfig.title}`,
      method: "mercadopago",
      amount: boostConfig.price,
      currency: "ARS",
      status: "pending",
    });

    const client = await getMpClient();
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: boostType,
            title: `UMPI Boost — ${boostConfig.title}`,
            description: `Impulso para "${listing.title}"`,
            category_id: "services",
            quantity: 1,
            unit_price: Number(boostConfig.price),
            currency_id: "ARS",
          },
        ],
        payer: { email: session.user.email },
        external_reference: txId,
        back_urls: backUrls,
        auto_return: "approved",
        binary_mode: true,
        statement_descriptor: "UMPI BOOST",
        ...(webhookUrl ? { notification_url: webhookUrl } : {}),
        metadata: {
          tx_id: txId,
          user_id: session.user.id,
          type: "boost",
          boost_id: boost.id,
          listing_id: listing.id,
          boost_type: boostType,
        },
      },
    });

    if (result.id) {
      await execute(
        `UPDATE \`Transaction\` SET mercadopagoPreferenceId = ?, updatedAt = ? WHERE id = ?`,
        [result.id, nowISO(), transaction.id]
      );
    }

    const initPoint = pickInitPoint(result);
    if (!initPoint) {
      return NextResponse.json(
        { error: "No se pudo generar el init_point de MercadoPago" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      init_point: initPoint,
      preference_id: result.id,
      tx_id: txId,
    });
  } catch (err: any) {
    console.error("POST /api/mercadopago/create-preference error:", err);

    // ─── DEMO MODE ───
    if (txId && isMpTokenError(err)) {
      try {
        const txRows = await query<Record<string, unknown>>(
          `SELECT t.*, s.id as sub_id, s.plan as sub_plan,
                  b.id as boost_id, b.type as boost_type, b.listingId as boost_listingId
           FROM \`Transaction\` t
           LEFT JOIN Subscription s ON s.id = t.subscriptionId
           LEFT JOIN Boost b ON b.id = t.boostId
           WHERE t.txId = ? LIMIT 1`,
          [txId]
        );
        if (txRows.length > 0) {
          const tx = txRows[0];
          // Subscription demo
          if (tx.sub_id) {
            const planSlug = String(tx.sub_plan);
            const plan = await getPlanBySlug(planSlug);
            return NextResponse.json({
              demo_mode: true,
              tx_id: String(tx.txId),
              type: "subscription",
              plan_slug: planSlug,
              plan_name: plan?.name || planSlug,
              amount: Number(tx.amount),
              currency: String(tx.currency),
              concept: String(tx.concept),
              subscription_id: String(tx.sub_id),
              message:
                "MercadoPago no está configurado. Usá el modo demo para simular el pago.",
            });
          }
          // Boost demo
          if (tx.boost_id) {
            const boostListingId = tx.boost_listingId ? String(tx.boost_listingId) : null;
            let listingTitle = "Publicación";
            if (boostListingId) {
              const listing = await getListingById(boostListingId);
              if (listing) listingTitle = listing.title;
            }
            return NextResponse.json({
              demo_mode: true,
              tx_id: String(tx.txId),
              type: "boost",
              boost_id: String(tx.boost_id),
              boost_type: tx.boost_type ? String(tx.boost_type) : null,
              listing_id: boostListingId,
              listing_title: listingTitle,
              amount: Number(tx.amount),
              currency: String(tx.currency),
              concept: String(tx.concept),
              message:
                "MercadoPago no está configurado. Usá el modo demo para simular el pago.",
            });
          }
        }
      } catch (lookupErr) {
        console.error("Demo mode lookup failed:", lookupErr);
      }
    }

    const errMsg = err?.message || "";
    if (errMsg.includes("MERCADOPAGO_ACCESS_TOKEN") || errMsg.includes("no configurado")) {
      return NextResponse.json(
        {
          error:
            "MercadoPago no está configurado. Pedile a un administrador que configure el Access Token desde Panel Admin → Sistema → MercadoPago.",
          code: "MP_NOT_CONFIGURED",
        },
        { status: 500 }
      );
    }
    if (err?.status === 403 || err?.code === "PA_UNAUTHORIZED_RESULT_FROM_POLICIES") {
      return NextResponse.json(
        {
          error:
            "El Access Token de MercadoPago es inválido o no tiene permisos. Verificá las credenciales en Panel Admin → Sistema → MercadoPago.",
          code: "MP_INVALID_TOKEN",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear la preferencia de pago", detail: errMsg },
      { status: 500 }
    );
  }
}
