import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Preference } from "mercadopago";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTxId } from "@/lib/utils-umpi";
import { getMpClient, pickInitPoint, getWebhookUrl } from "@/lib/mercadopago";
import { isMpTokenError } from "@/lib/mercadopago-actions";

// Precios de boosts (ARS) — también definidos en /api/mercadopago/boost
const BOOST_PRICES: Record<string, { price: number; days: number; title: string }> = {
  destacado: { price: 4990, days: 30, title: "Destacado (30 días)" },
  top: { price: 2990, days: 7, title: "Top (7 días)" },
  premium_destacado: { price: 9990, days: 30, title: "Premium Destacado (30 días + top)" },
};

// POST /api/mercadopago/create-preference
// Body: { type: "subscription" | "boost", planSlug?, listingId?, boostType? }
export async function POST(req: Request) {
  // txId is declared in the outer scope so the catch block can use it to
  // build a demo_mode response when the MP API call fails.
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

    // ─── Generate txId EARLY ───
    // We generate the txId and create the DB records BEFORE calling
    // getMpClient(), because getMpClient() throws when MP isn't configured
    // (placeholder token). By creating the records first, the catch block
    // can look up the transaction and return a demo_mode response so the
    // user can still simulate the payment flow.
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
      const plan = await db.plan.findUnique({ where: { slug: planSlug } });
      if (!plan || !plan.active) {
        return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
      }
      if (plan.price <= 0) {
        return NextResponse.json(
          { error: "Este plan es gratuito, no requiere pago" },
          { status: 400 }
        );
      }

      // Cancelar suscripción activa previa (si existe) — se reemplaza al aprobarse el pago
      const existing = await db.subscription.findFirst({
        where: { userId: session.user.id, status: "active" },
      });
      if (existing) {
        await db.subscription.update({
          where: { id: existing.id },
          data: { status: "canceled", cancelAtPeriodEnd: true },
        });
      }

      const subscription = await db.subscription.create({
        data: {
          userId: session.user.id,
          plan: plan.slug,
          status: "pending",
          amount: plan.price,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const transaction = await db.transaction.create({
        data: {
          txId,
          userId: session.user.id,
          subscriptionId: subscription.id,
          concept: `Suscripción ${plan.name} — mensual`,
          method: "mercadopago",
          amount: plan.price,
          currency: plan.currency || "ARS",
          status: "pending",
          invoiceType: plan.invoiceType,
        },
      });

      // Instantiate MP client AFTER the transaction is persisted so the
      // catch block can look it up and return demo_mode if MP is not configured.
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
            subscription_id: subscription.id,
          },
        },
      });

      await db.transaction.update({
        where: { id: transaction.id },
        data: { mercadopagoPreferenceId: result.id || null },
      });

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

    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, title: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }
    if (listing.sellerId !== session.user.id) {
      return NextResponse.json(
        { error: "No sos el dueño de esta publicación" },
        { status: 403 }
      );
    }

    const boost = await db.boost.create({
      data: {
        listingId: listing.id,
        userId: session.user.id,
        type: boostType,
        durationDays: boostConfig.days,
        amount: boostConfig.price,
        status: "pending",
      },
    });

    const transaction = await db.transaction.create({
      data: {
        txId,
        userId: session.user.id,
        boostId: boost.id,
        concept: `Boost ${boostConfig.title}`,
        method: "mercadopago",
        amount: boostConfig.price,
        currency: "ARS",
        status: "pending",
      },
    });

    // Instantiate MP client AFTER the transaction is persisted so the
    // catch block can look it up and return demo_mode if MP is not configured.
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

    await db.transaction.update({
      where: { id: transaction.id },
      data: { mercadopagoPreferenceId: result.id || null },
    });

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
    // When MP is not configured or the token is invalid/unauthorized, the
    // Subscription + Transaction (or Boost + Transaction) have ALREADY been
    // created in the DB above. Instead of returning a 500, we return a 200
    // with `demo_mode: true` so the frontend can route to the demo checkout
    // page and let the user simulate the payment.
    if (txId && isMpTokenError(err)) {
      try {
        const tx = await db.transaction.findUnique({
          where: { txId },
          include: { subscription: true, boost: true },
        });
        if (tx) {
          // ─── Subscription demo response ───
          if (tx.subscriptionId && tx.subscription) {
            const plan = await db.plan.findUnique({
              where: { slug: tx.subscription.plan },
            });
            return NextResponse.json({
              demo_mode: true,
              tx_id: tx.txId,
              type: "subscription",
              plan_slug: tx.subscription.plan,
              plan_name: plan?.name || tx.subscription.plan,
              amount: tx.amount,
              currency: tx.currency,
              concept: tx.concept,
              subscription_id: tx.subscription.id,
              message:
                "MercadoPago no está configurado. Usá el modo demo para simular el pago.",
            });
          }
          // ─── Boost demo response ───
          if (tx.boostId && tx.boost) {
            const boost = tx.boost;
            const listing = await db.listing.findUnique({
              where: { id: boost.listingId },
              select: { title: true },
            });
            return NextResponse.json({
              demo_mode: true,
              tx_id: tx.txId,
              type: "boost",
              boost_id: boost.id,
              boost_type: boost.type,
              listing_id: boost.listingId,
              listing_title: listing?.title || "Publicación",
              amount: tx.amount,
              currency: tx.currency,
              concept: tx.concept,
              message:
                "MercadoPago no está configurado. Usá el modo demo para simular el pago.",
            });
          }
        }
      } catch (lookupErr) {
        console.error("Demo mode lookup failed:", lookupErr);
      }
    }

    // Map known MP errors to user-friendly messages
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
    // MP policy / unauthorized errors usually mean invalid token
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
