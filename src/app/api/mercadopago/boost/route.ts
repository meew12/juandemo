import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Preference } from "mercadopago";
import { authOptions } from "@/lib/auth";
import {
  getListingById,
  createBoost,
  createTransaction,
  execute,
  query,
} from "@/lib/db-raw";
import { generateTxId } from "@/lib/utils-umpi";
import { getMpClient, pickInitPoint, getWebhookUrl } from "@/lib/mercadopago";
import { isMpTokenError } from "@/lib/mercadopago-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Tabla de precios y duraciones de boosts (ARS)
export const BOOST_PRICES: Record<string, { price: number; days: number; title: string }> = {
  destacado: { price: 4990, days: 30, title: "Destacado (30 días)" },
  top: { price: 2990, days: 7, title: "Top (7 días)" },
  premium_destacado: { price: 9990, days: 30, title: "Premium Destacado (30 días + top placement)" },
};

// POST /api/mercadopago/boost
// Body: { listingId, boostType: "destacado" | "top" | "premium_destacado" }
// Crea Boost + Transaction pendientes y devuelve el init_point de MercadoPago.
// Si MP no está configurado o el token es inválido, devuelve `demo_mode: true`
// para que el frontend pueda simular el pago.
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
    const { listingId, boostType } = body as {
      listingId: string;
      boostType: "destacado" | "top" | "premium_destacado";
    };

    if (!listingId || !boostType) {
      return NextResponse.json(
        { error: "Falta listingId o boostType" },
        { status: 400 }
      );
    }
    const config = BOOST_PRICES[boostType];
    if (!config) {
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
    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "La publicación no está activa" },
        { status: 400 }
      );
    }

    // Crear Boost pendiente
    const boost = await createBoost({
      listingId: listing.id,
      userId: session.user.id,
      type: boostType,
      durationDays: config.days,
      amount: config.price,
      status: "pending",
    });

    // Crear Transaction pendiente
    txId = generateTxId();
    const transaction = await createTransaction({
      txId,
      userId: session.user.id,
      boostId: boost.id,
      concept: `Boost ${config.title}`,
      method: "mercadopago",
      amount: config.price,
      currency: "ARS",
      status: "pending",
    });

    // Crear Preference en MercadoPago
    const client = await getMpClient();
    const preference = new Preference(client);

    const appId = process.env.NEXTAUTH_URL || "https://umpi.com.ar";
    const webhookUrl = await getWebhookUrl();

    const result = await preference.create({
      body: {
        items: [
          {
            id: boostType,
            title: `UMPI Boost — ${config.title}`,
            description: `Impulso para "${listing.title}"`,
            category_id: "services",
            quantity: 1,
            unit_price: Number(config.price),
            currency_id: "ARS",
          },
        ],
        payer: { email: session.user.email },
        external_reference: txId,
        back_urls: {
          success: `${appId}/?page=perfil&mp_status=success`,
          pending: `${appId}/?page=perfil&mp_status=pending`,
          failure: `${appId}/?page=perfil&mp_status=failure`,
        },
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

    // Guardar preferenceId en la transacción
    if (result.id) {
      await execute(
        `UPDATE \`Transaction\` SET mercadopagoPreferenceId = ?, updatedAt = ? WHERE id = ?`,
        [result.id, new Date().toISOString(), transaction.id]
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
      boost_id: boost.id,
      amount: config.price,
    });
  } catch (err: any) {
    console.error("POST /api/mercadopago/boost error:", err);

    // ─── DEMO MODE ───
    if (txId && isMpTokenError(err)) {
      try {
        const txRows = await query<Record<string, unknown>>(
          `SELECT t.*, b.id as boost_id, b.type as boost_type, b.listingId as boost_listingId
           FROM \`Transaction\` t
           LEFT JOIN Boost b ON b.id = t.boostId
           WHERE t.txId = ? LIMIT 1`,
          [txId]
        );
        if (txRows.length > 0) {
          const tx = txRows[0];
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
            boost_id: tx.boost_id ? String(tx.boost_id) : null,
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
      { error: "Error al crear el impulso", detail: errMsg },
      { status: 500 }
    );
  }
}
