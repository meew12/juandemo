"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HomePage } from "@/components/pages/home-page";
import { MarketplacePage } from "@/components/pages/marketplace-page";
import { DetailPage } from "@/components/pages/detail-page";
import { MensajesPage } from "@/components/pages/mensajes-page";
import { PerfilPage } from "@/components/pages/perfil-page";
import { PublicarPage } from "@/components/pages/publicar-page";
import { SuscripcionesPage } from "@/components/pages/suscripciones-page";
import { SellerProfilePage } from "@/components/pages/seller-profile-page";
import { AdminPage } from "@/components/pages/admin-page";
import { CheckoutDemoPage } from "@/components/pages/checkout-demo-page";
import { CookieConsent } from "@/components/cookie-consent";
import { MobileNav } from "@/components/mobile-nav";
import { CompareProvider } from "@/components/compare-context";
import { CompareBar } from "@/components/compare-bar";
import { CompareModal } from "@/components/compare-modal";
import { ScrollProgress } from "@/components/scroll-progress";
import { BackToTop } from "@/components/back-to-top";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { useWhatsAppStore } from "@/lib/whatsapp-store";

type PageState = {
  page: string;
  params?: any;
};

function readStateFromUrl(): PageState {
  if (typeof window === "undefined") return { page: "home" };
  const url = new URL(window.location.href);
  const page = url.searchParams.get("page") || "home";
  const params: any = {};
  if (url.searchParams.get("id")) params.id = url.searchParams.get("id")!;
  if (url.searchParams.get("slug")) params.slug = url.searchParams.get("slug")!;
  if (url.searchParams.get("q")) params.q = url.searchParams.get("q")!;
  if (url.searchParams.get("edit")) params.edit = url.searchParams.get("edit")!;
  return { page, params };
}

export default function Home() {
  const { data: session, status } = useSession();
  // Importante: el estado inicial SIEMPRE es { page: "home" } (server y primer
  // render del cliente) para evitar hydration mismatch. El useEffect de abajo
  // actualiza con la URL real después del mount.
  const [state, setState] = useState<PageState>({ page: "home" });
  const { phone: whatsappPhone, title: whatsappTitle } = useWhatsAppStore();
  // Después del mount, leer la URL real para navegar a la página correcta.
  // Esto evita hydration mismatch porque el primer render (server y cliente)
  // siempre es { page: "home" }, y solo después del mount actualizamos.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readStateFromUrl());
    const handlePopState = () => {
      setState(readStateFromUrl());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Handle MercadoPago return callback (?mp_status=success|pending|failure)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const mpStatus = url.searchParams.get("mp_status");
    if (!mpStatus) return;
    const messages: Record<string, { title: string; type: "success" | "info" | "error" }> = {
      success: {
        title: "¡Pago aprobado! 🎉",
        type: "success",
      },
      pending: {
        title: "Pago pendiente. Te avisaremos cuando se apruebe.",
        type: "info",
      },
      failure: {
        title: "El pago fue rechazado. Intentá nuevamente.",
        type: "error",
      },
    };
    const msg = messages[mpStatus];
    // Clean the URL so the toast doesn't reappear on refresh
    url.searchParams.delete("mp_status");
    url.searchParams.delete("collection_id");
    url.searchParams.delete("collection_status");
    url.searchParams.delete("payment_id");
    url.searchParams.delete("status");
    url.searchParams.delete("payment_type");
    url.searchParams.delete("preference_id");
    url.searchParams.delete("external_reference");
    url.searchParams.delete("merchant_order_id");
    window.history.replaceState({}, "", url.toString());
    // Defer the toast slightly so the SonnerToaster is mounted (it renders
    // in a portal and may not be ready on the very first mount tick).
    if (msg) {
      const timer = setTimeout(() => {
        if (msg.type === "success") toast.success(msg.title);
        else if (msg.type === "info") toast.info(msg.title);
        else toast.error(msg.title);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const navigate = useCallback((page: string, params?: any) => {
    setState({ page, params });
    const url = new URL(window.location.href);
    url.searchParams.set("page", page);
    url.searchParams.delete("id");
    url.searchParams.delete("slug");
    url.searchParams.delete("q");
    url.searchParams.delete("edit");
    if (params?.id) url.searchParams.set("id", params.id);
    if (params?.slug) url.searchParams.set("slug", params.slug);
    if (params?.q) url.searchParams.set("q", params.q);
    if (params?.edit) url.searchParams.set("edit", params.edit);
    window.history.pushState({}, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Pages that should hide the footer (immersive)
  const hideFooter = state.page === "admin" || state.page === "mensajes" || state.page === "detail" || state.page === "checkout-demo";
  // Pages that should hide the navbar (admin has its own)
  const hideNavbar = state.page === "admin";

  // Admin access check
  const isAdmin = (session?.user as any)?.role === "admin";

  if (hideNavbar) {
    if (state.page === "admin") {
      // Mientras la sesión esté cargando, mostrar un estado neutro.
      // (No hay hydration mismatch porque state.page inicial siempre es "home".)
      if (status === "loading") {
        return (
          <div className="min-h-screen grid place-items-center bg-[var(--umpi-bg)]">
            <div className="text-[var(--umpi-text2)]">Cargando…</div>
          </div>
        );
      }
      if (!session || !isAdmin) {
        return (
          <div className="min-h-screen grid place-items-center bg-[var(--umpi-bg)] p-4">
            <div className="text-center">
              <h1 className="font-display text-2xl mb-2">Acceso restringido</h1>
              <p className="text-[var(--umpi-text2)] mb-4">
                Necesitás permisos de administrador para acceder a esta sección.
              </p>
              <button
                onClick={() => navigate("home")}
                className="text-[var(--umpi-accent)] underline"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        );
      }
      return (
        <CompareProvider>
          <AdminPage onNavigate={navigate} />
        </CompareProvider>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--umpi-bg)]">
      <CompareProvider>
        <ScrollProgress />
        <Navbar currentPage={state.page} onNavigate={navigate} />
        <main className="flex-1">
          {state.page === "home" && <HomePage onNavigate={navigate} />}
          {state.page === "servicios" && (
            <MarketplacePage
              pageKey="servicios"
              onNavigate={navigate}
              initialQuery={state.params?.q}
            />
          )}
          {state.page === "autos" && (
            <MarketplacePage pageKey="autos" onNavigate={navigate} initialQuery={state.params?.q} />
          )}
          {state.page === "propiedades" && (
            <MarketplacePage
              pageKey="propiedades"
              onNavigate={navigate}
              initialQuery={state.params?.q}
            />
          )}
          {state.page === "detail" && (
            <DetailPage slug={state.params?.slug || state.params?.id || ""} onNavigate={navigate} />
          )}
          {state.page === "seller" && (
            <SellerProfilePage sellerId={state.params?.id} onNavigate={navigate} />
          )}
          {state.page === "mensajes" && <MensajesPage onNavigate={navigate} />}
          {state.page === "perfil" && <PerfilPage onNavigate={navigate} />}
          {state.page === "publicar" && <PublicarPage onNavigate={navigate} editId={state.params?.edit} />}
          {state.page === "suscripciones" && <SuscripcionesPage onNavigate={navigate} />}
          {state.page === "checkout-demo" && (
            <CheckoutDemoPage params={state.params} onNavigate={navigate} />
          )}
        </main>
        {!hideFooter && <Footer onNavigate={navigate} />}
        <BackToTop />
        <WhatsAppFab
          phone={whatsappPhone || undefined}
          title={whatsappTitle || undefined}
          visible={state.page === "detail"}
        />
        <CompareBar onNavigate={navigate} />
        <CompareModal onNavigate={navigate} />
        <MobileNav currentPage={state.page} onNavigate={navigate} />
        <CookieConsent />
      </CompareProvider>
    </div>
  );
}
