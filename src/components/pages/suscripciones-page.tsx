"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Star,
  Check,
  X,
  Crown,
  Rocket,
  Sparkles,
  ShieldCheck,
  Headphones,
  TrendingUp,
  Lock,
  ArrowRight,
  BadgeCheck,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard } from "@/components/listing-card";
import { toast } from "sonner";
import { formatPriceWithUnit } from "@/lib/utils-umpi";
import type { Listing, Plan } from "@/lib/types";

// ─── Fetchers ───
async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch("/api/plans");
  if (!res.ok) throw new Error("Error al cargar planes");
  const data = await res.json();
  return data.plans as Plan[];
}

async function fetchTop10(): Promise<Listing[]> {
  const res = await fetch("/api/listings?sort=views&limit=10");
  if (!res.ok) throw new Error("Error al cargar Top 10");
  const data = await res.json();
  return data.listings as Listing[];
}

interface PreferenceResponse {
  init_point?: string;
  preference_id?: string;
  tx_id: string;
  // Demo mode fields (returned when MP isn't configured or the token is invalid)
  demo_mode?: boolean;
  type?: "subscription" | "boost";
  plan_slug?: string;
  plan_name?: string;
  amount?: number;
  currency?: string;
  concept?: string;
  subscription_id?: string;
  message?: string;
}

async function createPreference(payload: {
  type: "subscription";
  planSlug: string;
}): Promise<PreferenceResponse> {
  const res = await fetch("/api/mercadopago/create-preference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al crear la preferencia");
  return data as PreferenceResponse;
}

// ─── Static content ───
const HERO_STATS = [
  { icon: TrendingUp, label: "Publicaciones ilimitadas", color: "var(--umpi-purple)" },
  { icon: Headphones, label: "Soporte 24/7", color: "var(--umpi-accent)" },
  { icon: BadgeCheck, label: "Badge verificado", color: "var(--umpi-gold)" },
  { icon: Crown, label: "Acceso Top 10", color: "var(--umpi-purple)" },
];

const TESTIMONIALS = [
  {
    name: "Martín R.",
    plan: "Pro",
    initials: "MR",
    text: "Subí a Pro y en dos semanas triplicaron mis consultas. El Top 10 semanal es oro puro para conseguir clientes.",
  },
  {
    name: "Claudia L.",
    plan: "Business",
    initials: "CL",
    text: "Como agencia necesitábamos publicaciones ilimitadas y multi-usuario. Business nos dio todo eso más factura A. Impecable.",
  },
  {
    name: "Pablo G.",
    plan: "Pro",
    initials: "PG",
    text: "El badge verificado me dio credibilidad de entrada. Los clientes me contactan sabiendo que soy un profesional real.",
  },
];

const FAQS = [
  {
    q: "¿Qué es el Top 10 semanal?",
    a: "Es una selección curada cada semana de las 10 mejores publicaciones de UMPI según vistas, reseñas y actividad. Los planes Pro y Business pueden ver el listado completo y aparecer destacados en él, mientras que los usuarios del plan Básico solo ven las primeras 3.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, podés cancelar tu suscripción en cualquier momento desde la sección Mi Perfil → Suscripción. La cancelación se aplica al final del período ya pago y no hay penalidades ni costos extra.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Aceptamos Visa, Mastercard, American Express, Mercado Pago (saldo y tarjetas guardadas), MODO y transferencia bancaria. Los pagos se procesan de forma segura a través de Mercado Pago.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí, podés subir o bajar de plan en cualquier momento. Si mejorás de plan, se prorratea el monto restante del mes actual. Si bajás, el cambio se aplica a partir del próximo ciclo de facturación.",
  },
  {
    q: "¿Emiten factura?",
    a: "Sí. El plan Pro recibe Factura B y el plan Business recibe Factura A con IVA discriminado. Las facturas se generan automáticamente al confirmarse cada pago y están disponibles en tu perfil.",
  },
];

// ─── Page ───
export function SuscripcionesPage({
  onNavigate,
}: {
  onNavigate: (page: string, params?: any) => void;
}) {
  const { data: session, status } = useSession();
  const userPlan = (session?.user as any)?.plan as string | undefined;

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: fetchPlans,
  });

  const { data: top10, isLoading: topLoading } = useQuery({
    queryKey: ["top10-weekly"],
    queryFn: fetchTop10,
  });

  const preferenceMutation = useMutation({
    mutationFn: createPreference,
    onSuccess: (data) => {
      // Demo mode: MP isn't configured or the token is invalid. The backend
      // already created the Subscription + Transaction with status="pending".
      // Route to the demo checkout page so the user can simulate the payment.
      if (data?.demo_mode === true) {
        toast.info("MercadoPago no está configurado — activaste el modo demo.");
        onNavigate("checkout-demo", data);
        return;
      }
      // Real MP: redirect to the checkout URL.
      if (data.init_point) {
        window.location.href = data.init_point;
        return;
      }
      toast.error("Respuesta inesperada del servidor de pagos.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al iniciar el pago");
    },
  });

  const hasTopAccess = userPlan === "pro" || userPlan === "business";

  // CTAs
  const handleSubscribe = (planSlug: string, planName: string) => {
    if (status !== "authenticated") {
      toast.error("Iniciá sesión para suscribirte");
      onNavigate("home");
      return;
    }
    if (userPlan === planSlug) {
      toast.info("Ya estás en este plan");
      return;
    }
    toast.loading(`Preparando pago de ${planName}…`, { id: "mp-load" });
    preferenceMutation.mutate(
      { type: "subscription", planSlug },
      {
        onSuccess: () => toast.dismiss("mp-load"),
        onError: () => toast.dismiss("mp-load"),
      }
    );
  };

  const handleBasico = () => {
    if (status !== "authenticated") {
      toast.error("Iniciá sesión para empezar");
      onNavigate("home");
      return;
    }
    toast.success("Ya tenés el plan Básico activo");
    onNavigate("perfil");
  };

  return (
    <div className="animate-fade-in">
      {/* ─── HERO ─── */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(135deg, #1a0f2e 0%, #2d1b4e 50%, #4c1d95 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 800px 400px at 50% 0%, rgba(124,58,237,0.35) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <Badge
              className="mb-5 px-3 py-1.5 bg-white/10 text-white border-white/20 backdrop-blur gap-1.5"
              variant="outline"
            >
              <Star className="w-3.5 h-3.5 fill-[var(--umpi-gold)] text-[var(--umpi-gold)]" />
              UMPI Premium
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-5">
              Llevá tu negocio al siguiente nivel
            </h1>
            <p className="text-lg sm:text-xl text-purple-100/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Publicaciones ilimitadas, badge verificado, acceso al Top 10 semanal
              y soporte prioritario. Elegí el plan que acompaña tu crecimiento.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
              {HERO_STATS.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur"
                >
                  <s.icon
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    style={{ color: s.color }}
                  />
                  <span className="text-xs sm:text-sm font-medium text-purple-50 text-center leading-tight">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PLAN CARDS ─── */}
      <section className="py-16 sm:py-20 bg-[var(--umpi-bg)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="font-display text-3xl sm:text-4xl mb-3">
              Elegí tu plan
            </h2>
            <p className="text-[var(--umpi-text2)] max-w-xl mx-auto">
              Sin permanencia, cancelás cuando quieras. Todos los precios en
              pesos argentinos (ARS) + impuestos.
            </p>
          </div>

          {plansLoading ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[520px] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
              {plans?.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={userPlan === plan.slug}
                  loadingPlanSlug={
                    preferenceMutation.isPending
                      ? (preferenceMutation.variables as any)?.planSlug
                      : undefined
                  }
                  onSubscribe={() => handleSubscribe(plan.slug, plan.name)}
                  onBasico={handleBasico}
                  isAuthenticated={status === "authenticated"}
                />
              ))}
            </div>
          )}

          <p className="text-center text-xs text-[var(--umpi-text3)] mt-8">
            Pagos procesados por Mercado Pago · Factura A (Business) o B (Pro) ·
            Cancelación en cualquier momento
          </p>
        </div>
      </section>

      {/* ─── TOP 10 SEMANAL ─── */}
      <section className="py-16 sm:py-20 bg-[var(--umpi-surface2)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <Badge
              className="mb-3 px-3 py-1 bg-[var(--umpi-purple-soft)] text-[var(--umpi-purple)] border-[var(--umpi-purple)]/20"
              variant="outline"
            >
              <Crown className="w-3.5 h-3.5 mr-1" /> Top 10 semanal
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl mb-3">
              Las publicaciones más vistas de la semana
            </h2>
            <p className="text-[var(--umpi-text2)] max-w-2xl mx-auto">
              Una selección curada de lo mejor de UMPI. Los planes{" "}
              <span className="font-semibold text-[var(--umpi-purple)]">Pro</span> y{" "}
              <span className="font-semibold text-[var(--umpi-purple)]">Business</span>{" "}
              acceden al listado completo.
            </p>
          </div>

          {topLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
              ))}
            </div>
          ) : top10 && top10.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {top10.map((listing, idx) => {
                const locked = !hasTopAccess && idx >= 3;
                return (
                  <div
                    key={listing.id}
                    className="relative rounded-xl overflow-hidden"
                  >
                    <div className={locked ? "blur-[6px] pointer-events-none select-none" : ""}>
                      <ListingCard
                        listing={listing}
                        onClick={() =>
                          onNavigate("detail", { slug: listing.slug })
                        }
                      />
                    </div>
                    {/* Rank badge */}
                    <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-black/70 backdrop-blur text-white text-xs font-bold grid place-items-center">
                      {idx + 1}
                    </div>
                    {/* Paywall overlay para los bloqueados */}
                    {locked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-t from-[var(--umpi-purple)] via-[var(--umpi-purple)]/70 to-transparent">
                        <Lock className="w-6 h-6 text-white mb-2" />
                        <p className="text-white text-xs font-semibold mb-3 leading-tight">
                          Desbloqueá el Top 10 completo
                        </p>
                        <Button
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("planes-cta")
                              ?.scrollIntoView({ behavior: "smooth" })
                          }
                          className="bg-white text-[var(--umpi-purple)] hover:bg-purple-50 text-xs h-8 px-3"
                        >
                          Ver planes desde $7.990/mes →
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[var(--umpi-text2)] py-12">
              Todavía no hay publicaciones para mostrar esta semana.
            </p>
          )}

          {!hasTopAccess && (
            <div
              id="planes-cta"
              className="mt-10 max-w-2xl mx-auto rounded-2xl p-6 sm:p-8 text-center text-white"
              style={{
                background:
                  "linear-gradient(135deg, #1a0f2e 0%, #4c1d95 100%)",
              }}
            >
              <Sparkles className="w-7 h-7 mx-auto mb-3 text-[var(--umpi-gold)]" />
              <h3 className="font-display text-2xl mb-2">
                Accedé al Top 10 completo
              </h3>
              <p className="text-purple-100/90 mb-5">
                Sumá más vistas, contactos y ventas. Planes desde $7.990/mes.
              </p>
              <Button
                onClick={() =>
                  document
                    .getElementById("plan-pro")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-white text-[var(--umpi-purple)] hover:bg-purple-50"
              >
                Ver planes <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-16 sm:py-20 bg-[var(--umpi-bg)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="font-display text-3xl sm:text-4xl mb-3">
              Lo que dicen nuestros Premium
            </h2>
            <p className="text-[var(--umpi-text2)] max-w-xl mx-auto">
              Miles de vendedores ya están creciendo con UMPI Premium.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-6 flex flex-col"
              >
                <Quote
                  className="w-8 h-8 mb-4"
                  style={{ color: "var(--umpi-purple)" }}
                />
                <p className="italic text-[var(--umpi-text)] leading-relaxed mb-5 flex-1">
                  “{t.text}”
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-[var(--umpi-border)]">
                  <div
                    className="w-10 h-10 rounded-full grid place-items-center text-white font-semibold text-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <Badge
                      variant="outline"
                      className="mt-0.5 text-[10px] gap-1 bg-[var(--umpi-purple-soft)] text-[var(--umpi-purple)] border-[var(--umpi-purple)]/20"
                    >
                      <Star className="w-2.5 h-2.5 fill-current" /> {t.plan}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 sm:py-20 bg-[var(--umpi-surface2)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl mb-3">
              Preguntas frecuentes
            </h2>
            <p className="text-[var(--umpi-text2)]">
              Todo lo que necesitás saber sobre UMPI Premium.
            </p>
          </div>

          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl px-4 sm:px-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, idx) => (
                <AccordionItem
                  key={faq.q}
                  value={`item-${idx}`}
                  className={idx === FAQS.length - 1 ? "border-b-0" : ""}
                >
                  <AccordionTrigger className="text-base font-semibold text-left hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[var(--umpi-text2)] leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="mt-10 text-center">
            <p className="text-[var(--umpi-text2)] mb-3">
              ¿Otras dudas? Escribinos a{" "}
              <a
                href="mailto:hola@umpi.com.ar"
                className="text-[var(--umpi-accent)] font-medium hover:underline"
              >
                hola@umpi.com.ar
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Plan Card Component ───
function PlanCard({
  plan,
  isCurrent,
  loadingPlanSlug,
  onSubscribe,
  onBasico,
  isAuthenticated,
}: {
  plan: Plan;
  isCurrent: boolean;
  loadingPlanSlug?: string;
  onSubscribe: () => void;
  onBasico: () => void;
  isAuthenticated: boolean;
}) {
  const isPro = plan.slug === "pro";
  const isBasico = plan.slug === "basico";
  const features = useMemo(
    () => (Array.isArray(plan.features) ? (plan.features as unknown as string[]) : []),
    [plan.features]
  );
  const loading = loadingPlanSlug === plan.slug;

  // Para Básico, mostramos todas las features con ✓, y las que NO tiene con ✗
  // Para Pro/Business, todas las features del plan tienen ✓
  const displayFeatures = features.map((f) => ({ text: f, included: true }));

  // Features que Básico NO tiene, para mostrar con ✗ (referencia cruzada)
  const missingForBasico = [
    "Acceso al Top 10 semanal",
    "Badge verificado en tu perfil",
    "Estadísticas avanzadas",
    "Soporte prioritario por chat",
    "Publicaciones ilimitadas",
  ];

  return (
    <div
      id={isPro ? "plan-pro" : undefined}
      className={`relative bg-[var(--umpi-surface)] rounded-2xl p-6 sm:p-7 flex flex-col border-2 transition-all ${
        isPro
          ? "border-[var(--umpi-purple)] shadow-[0_24px_64px_rgba(124,58,237,0.18)] lg:-translate-y-2"
          : "border-[var(--umpi-border)]"
      } ${isCurrent ? "ring-2 ring-[var(--umpi-green)] ring-offset-2 ring-offset-[var(--umpi-bg)]" : ""}`}
    >
      {/* Ribbon "MÁS POPULAR" */}
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span
            className="px-4 py-1 rounded-full text-xs font-bold text-white tracking-wide uppercase whitespace-nowrap"
            style={{ background: "var(--umpi-purple)" }}
          >
            ⭐ Más popular
          </span>
        </div>
      )}

      {/* Badge "Plan actual" */}
      {isCurrent && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[var(--umpi-green)]/20 text-[10px] gap-1">
            <Check className="w-3 h-3" /> Plan actual
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-display text-2xl">{plan.name}</h3>
          {plan.slug === "business" && (
            <Rocket className="w-5 h-5" style={{ color: "var(--umpi-accent)" }} />
          )}
          {isPro && (
            <Crown className="w-5 h-5" style={{ color: "var(--umpi-purple)" }} />
          )}
        </div>
        <p className="text-sm text-[var(--umpi-text2)] min-h-[40px]">
          {plan.description}
        </p>
      </div>

      {/* Price */}
      <div className="mb-6 pb-6 border-b border-[var(--umpi-border)]">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl sm:text-5xl text-[var(--umpi-text)]">
            {formatPriceWithUnit(plan.price, plan.currency)}
          </span>
          <span className="text-sm text-[var(--umpi-text2)]">/mes</span>
        </div>
        {plan.slug === "pro" && (
          <p className="text-xs text-[var(--umpi-text3)] mt-1">
            ≈ $266/día · Cancelá cuando quieras
          </p>
        )}
        {plan.slug === "business" && (
          <p className="text-xs text-[var(--umpi-text3)] mt-1">
            ≈ $833/día · Hasta 5 usuarios
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-7 flex-1">
        {displayFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Check
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: "var(--umpi-green)" }}
            />
            <span className="text-[var(--umpi-text)]">{f.text}</span>
          </li>
        ))}
        {isBasico &&
          missingForBasico.map((f, i) => (
            <li key={`m-${i}`} className="flex items-start gap-2.5 text-sm">
              <X
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--umpi-text3)" }}
              />
              <span className="text-[var(--umpi-text3)] line-through">{f}</span>
            </li>
          ))}
      </ul>

      {/* CTA */}
      {isBasico ? (
        <Button
          onClick={onBasico}
          disabled={isCurrent || loading}
          variant="outline"
          className="w-full h-11"
        >
          {isCurrent ? "Plan actual" : "Empezar gratis"}
        </Button>
      ) : (
        <Button
          onClick={onSubscribe}
          disabled={isCurrent || loading}
          className="w-full h-11"
          style={
            isPro && !isCurrent
              ? { background: "var(--umpi-purple)", color: "white" }
              : undefined
          }
        >
          {loading ? (
            <>
              <span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Procesando…
            </>
          ) : isCurrent ? (
            "Plan actual"
          ) : (
            `Suscribirme — ${plan.name}`
          )}
        </Button>
      )}

      {/* Trust badge */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--umpi-text3)]">
        <ShieldCheck className="w-3.5 h-3.5" />
        Pago seguro con Mercado Pago
        {!isAuthenticated && (
          <span className="text-[var(--umpi-accent)] ml-1">· Iniciá sesión</span>
        )}
      </div>
    </div>
  );
}
