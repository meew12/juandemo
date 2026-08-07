import { NextResponse } from "next/server";
import {
  Payment,
  PreApproval,
  MerchantOrder,
  WebhookSignatureValidator,
} from "mercadopago";
import { getMpClient, getMpCredentials } from "@/lib/mercadopago";
import {
  mapPaymentStatus,
  mapPreApprovalStatus,
  applyTransactionUpdate,
} from "@/lib/mercadopago-actions";

// POST /api/mercadopago/webhook
// Recibe notificaciones IPN/webhook de MercadoPago.
// Tipos soportados: payment | preapproval | merchant_order
// Siempre devuelve 200 { received: true } — requisito de MercadoPago.
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    const type: string | undefined =
      body?.type || url.searchParams.get("type") || undefined;
    const dataId: string | undefined =
      body?.data?.id || body?.data_id || url.searchParams.get("data.id") || undefined;
    const action: string | undefined = body?.action;

    // ─── Verificación de firma (opcional) ───
    // Solo si mp.webhook_secret está configurado Y el header x-signature vino.
    const creds = await getMpCredentials();
    const secret = creds.webhookSecret || undefined;
    const xSignature = req.headers.get("x-signature") || undefined;
    const xRequestId = req.headers.get("x-request-id") || undefined;
    if (secret && xSignature && dataId) {
      try {
        WebhookSignatureValidator.validate({
          xSignature,
          xRequestId,
          dataId,
          secret,
          toleranceSeconds: 300,
        });
      } catch (err) {
        console.warn("Webhook signature inválida:", (err as Error)?.message);
        // Igual respondemos 200 para que MP no reintente, pero ignoramos el evento.
        return NextResponse.json({ received: true, status: "invalid_signature" });
      }
    }

    if (!type || !dataId) {
      // Ping de prueba o payload sin info accionable.
      return NextResponse.json({ received: true });
    }

    if (!creds.accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN no configurado");
      return NextResponse.json({ received: true });
    }
    const client = await getMpClient();

    // ─── PAYMENT ───
    if (type === "payment" || action?.startsWith("payment")) {
      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: dataId }).catch((e) => {
        console.error("Error fetching payment:", e?.message);
        return null;
      });
      if (!payment) return NextResponse.json({ received: true });

      const txId = payment.external_reference;
      const status = mapPaymentStatus(payment.status);
      if (!txId) return NextResponse.json({ received: true });

      await applyTransactionUpdate(txId, status, String(dataId), payment.transaction_amount);
      return NextResponse.json({ received: true });
    }

    // ─── PREAPPROVAL (suscripción recurrente) ───
    if (type === "preapproval" || action?.startsWith("preapproval")) {
      const preApprovalClient = new PreApproval(client);
      const preapproval = await preApprovalClient.get({ id: dataId }).catch((e) => {
        console.error("Error fetching preapproval:", e?.message);
        return null;
      });
      if (!preapproval) return NextResponse.json({ received: true });

      const txId = preapproval.external_reference;
      const status = mapPreApprovalStatus(preapproval.status);
      if (!txId) return NextResponse.json({ received: true });

      await applyTransactionUpdate(txId, status, String(dataId), undefined, preapproval.id);
      return NextResponse.json({ received: true });
    }

    // ─── MERCHANT_ORDER ───
    if (type === "merchant_order" || action?.startsWith("merchant_order")) {
      const merchantClient = new MerchantOrder(client);
      const order = await merchantClient.get({ merchantOrderId: Number(dataId) }).catch((e) => {
        console.error("Error fetching merchant_order:", e?.message);
        return null;
      });
      if (!order) return NextResponse.json({ received: true });

      // Un merchant_order puede tener varios payments. Aprobamos si la suma cubre el monto.
      const payments = (order.payments as any[]) || [];
      for (const p of payments) {
        const txId = order.external_reference;
        const status = mapPaymentStatus(p.status);
        if (txId && status) {
          await applyTransactionUpdate(txId, status, String(p.id), p.transaction_amount);
        }
      }
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("POST /api/mercadopago/webhook error:", err);
    // Igual devolvemos 200 para evitar reintentos infinitos de MP.
    return NextResponse.json({ received: true, error: "internal" });
  }
}

// GET también responde OK — MP hace un ping inicial.
export async function GET() {
  return NextResponse.json({ received: true });
}

// ─── Helpers ───
// mapPaymentStatus, mapPreApprovalStatus, applyTransactionUpdate,
// activateSubscription and activateBoost now live in
// `/src/lib/mercadopago-actions.ts` so they can be reused by the
// demo-complete endpoint (and any future caller).
