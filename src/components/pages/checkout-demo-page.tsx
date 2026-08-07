"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Lock,
  Sparkles,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils-umpi";

// ─── Types ───
type DemoStatus = "approved" | "pending" | "rejected";

interface CheckoutDemoParams {
  tx_id: string;
  type: "subscription" | "boost";
  // Subscription fields
  plan_slug?: string;
  plan_name?: string;
  subscription_id?: string;
  // Boost fields
  boost_id?: string;
  boost_type?: "destacado" | "top" | "premium_destacado";
  listing_id?: string;
  listing_title?: string;
  // Common
  amount: number;
  currency?: string;
  concept: string;
  message?: string;
}

interface DemoCompleteResponse {
  success: boolean;
  status: DemoStatus;
  tx_id: string;
  type: "subscription" | "boost";
  redirect: string;
  error?: string;
}

// ─── Helper: format amount as ARS ───
function formatAmount(amount: number, currency: string = "ARS"): string {
  return formatPrice(amount, currency);
}

// ─── Boost type labels ───
const BOOST_LABELS: Record<string, string> = {
  destacado: "Destacado",
  top: "Top",
  premium_destacado: "Premium Destacado",
};

// ─── Page ───
export function CheckoutDemoPage({
  params,
  onNavigate,
}: {
  params: CheckoutDemoParams;
  onNavigate: (page: string, params?: any) => void;
}) {
  const [pendingStatus, setPendingStatus] = useState<DemoStatus | null>(null);

  const isSubscription = params.type === "subscription";
  const pageTitle = isSubscription ? "Suscripción" : "Impulso de publicación";
  const subtitle = isSubscription
    ? "Activá tu plan premium"
    : "Destacá tu publicación";

  const handleSimulate = async (status: DemoStatus) => {
    if (!params.tx_id) {
      toast.error("Falta el ID de la transacción");
      return;
    }
    setPendingStatus(status);
    try {
      const res = await fetch("/api/mercadopago/demo-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id: params.tx_id, status }),
      });
      const data = (await res.json()) as DemoCompleteResponse;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo completar el pago demo");
      }

      // Show a toast based on the simulated status
      if (status === "approved") {
        toast.success("¡Pago aprobado! 🎉");
      } else if (status === "pending") {
        toast.info("Pago pendiente. Te avisaremos cuando se apruebe.");
      } else {
        toast.error("El pago fue rechazado.");
      }

      // Redirect via the SPA router to the redirect URL the API returned.
      // The redirect looks like "?page=suscripciones&mp_status=success" —
      // we parse out the page + mp_status so onNavigate can set state and
      // the page.tsx mp_status useEffect picks it up to show the toast.
      const redirectParams = new URLSearchParams(
        data.redirect.startsWith("?")
          ? data.redirect.slice(1)
          : data.redirect
      );
      const targetPage = redirectParams.get("page") || (isSubscription ? "suscripciones" : "perfil");
      const mpStatus = redirectParams.get("mp_status");
      // Push the mp_status onto the URL so the existing handler in page.tsx
      // shows the right toast and cleans the URL.
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set("page", targetPage);
      if (mpStatus) targetUrl.searchParams.set("mp_status", mpStatus);
      window.history.pushState({}, "", targetUrl.toString());
      // Trigger a popstate so the page picks up the new state.
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err: any) {
      toast.error(err.message || "Error al simular el pago");
    } finally {
      setPendingStatus(null);
    }
  };

  const handleCancel = () => {
    onNavigate(isSubscription ? "suscripciones" : "perfil");
  };

  // ─── Empty state: no params ───
  if (!params || !params.tx_id) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 py-16">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle
              className="w-10 h-10 mx-auto mb-3"
              style={{ color: "var(--umpi-accent)" }}
            />
            <CardTitle className="font-display text-xl">
              No hay una orden para procesar
            </CardTitle>
            <CardDescription>
              Volvé a iniciar la compra desde la sección correspondiente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => onNavigate("home")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-72px)] py-8 sm:py-12 px-4"
      style={{
        background:
          "radial-gradient(ellipse 800px 400px at 50% 0%, rgba(228,76,30,0.06) 0%, transparent 60%), var(--umpi-bg)",
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* ─── Header ─── */}
        <div className="text-center mb-6 sm:mb-8">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide"
            style={{
              background: "var(--umpi-gold-soft)",
              color: "var(--umpi-gold)",
              border: "1px solid var(--umpi-gold)",
            }}
          >
            <Lock className="w-3.5 h-3.5" />
            Checkout Demo
          </div>
          <h1 className="font-display text-3xl sm:text-4xl mb-2">{pageTitle}</h1>
          <p className="text-[var(--umpi-text2)]">{subtitle}</p>
        </div>

        {/* ─── Demo mode banner ─── */}
        <div
          className="mb-6 rounded-xl p-4 sm:p-5 flex gap-3 items-start border"
          style={{
            background: "rgba(196,154,42,0.08)",
            borderColor: "rgba(196,154,42,0.3)",
          }}
        >
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: "var(--umpi-gold)" }}
          />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold mb-1" style={{ color: "var(--umpi-gold)" }}>
              MercadoPago no está configurado
            </p>
            <p className="text-[var(--umpi-text2)]">
              {params.message ||
                "Esta es una transacción simulada. Elegí un resultado de pago abajo para probar el flujo completo. No se cobrará nada real."}
            </p>
          </div>
        </div>

        {/* ─── Order summary card ─── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display text-lg">Resumen de la orden</CardTitle>
                <CardDescription>
                  Transacción <code className="font-mono text-xs">{params.tx_id}</code>
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="gap-1.5"
                style={{
                  background: isSubscription
                    ? "var(--umpi-purple-soft)"
                    : "var(--umpi-accent-soft, rgba(228,76,30,0.1))",
                  color: isSubscription ? "var(--umpi-purple)" : "var(--umpi-accent)",
                  borderColor: isSubscription
                    ? "var(--umpi-purple)"
                    : "var(--umpi-accent)",
                }}
              >
                {isSubscription ? (
                  <Sparkles className="w-3.5 h-3.5" />
                ) : (
                  <Rocket className="w-3.5 h-3.5" />
                )}
                {isSubscription ? "Suscripción" : "Impulso"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Concept row */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--umpi-border)]">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-[var(--umpi-text3)] mb-1">
                  Concepto
                </p>
                <p className="font-medium text-[var(--umpi-text)] break-words">
                  {params.concept}
                </p>
                {isSubscription && params.plan_name && (
                  <p className="text-sm text-[var(--umpi-text2)] mt-1">
                    Plan:{" "}
                    <span className="font-semibold">{params.plan_name}</span>
                  </p>
                )}
                {!isSubscription && params.listing_title && (
                  <p className="text-sm text-[var(--umpi-text2)] mt-1">
                    Publicación:{" "}
                    <span className="font-semibold">{params.listing_title}</span>
                    {params.boost_type && (
                      <span className="text-[var(--umpi-text3)]">
                        {" "}
                        · {BOOST_LABELS[params.boost_type] || params.boost_type}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Amount row */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[var(--umpi-text2)]">Total a pagar</span>
              <span className="font-display text-3xl text-[var(--umpi-text)]">
                {formatAmount(params.amount, params.currency)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--umpi-text3)] pt-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Pago seguro (modo demostración)
            </div>
          </CardContent>
        </Card>

        {/* ─── Action buttons ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Simular resultado del pago
            </CardTitle>
            <CardDescription>
              Elegí cómo continuar. Esto activará o rechazará la orden en la base de datos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Aprobado */}
            <Button
              onClick={() => handleSimulate("approved")}
              disabled={pendingStatus !== null}
              className="w-full h-12 text-base font-semibold"
              style={{
                background: "var(--umpi-green)",
                color: "white",
              }}
            >
              {pendingStatus === "approved" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Simular pago aprobado
                </>
              )}
            </Button>

            {/* Pendiente */}
            <Button
              onClick={() => handleSimulate("pending")}
              disabled={pendingStatus !== null}
              variant="outline"
              className="w-full h-12 text-base font-semibold"
              style={{
                borderColor: "var(--umpi-gold)",
                color: "var(--umpi-gold)",
                background: "var(--umpi-gold-soft)",
              }}
            >
              {pendingStatus === "pending" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Simular pago pendiente
                </>
              )}
            </Button>

            {/* Rechazado */}
            <Button
              onClick={() => handleSimulate("rejected")}
              disabled={pendingStatus !== null}
              variant="outline"
              className="w-full h-12 text-base font-semibold"
              style={{
                borderColor: "#dc2626",
                color: "#dc2626",
                background: "rgba(220,38,38,0.05)",
              }}
            >
              {pendingStatus === "rejected" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Simular pago rechazado
                </>
              )}
            </Button>

            {/* Cancelar */}
            <Button
              onClick={handleCancel}
              disabled={pendingStatus !== null}
              variant="ghost"
              className="w-full h-11 mt-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancelar y volver
            </Button>
          </CardContent>
        </Card>

        {/* ─── Footer note ─── */}
        <p className="text-center text-xs text-[var(--umpi-text3)] mt-6 leading-relaxed">
          Este es un entorno de demostración. En producción, serías redirigido a
          MercadoPago para realizar el pago real de forma segura.
        </p>
      </div>
    </div>
  );
}
