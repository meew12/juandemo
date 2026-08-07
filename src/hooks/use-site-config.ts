"use client";

import { useQuery } from "@tanstack/react-query";

export type SiteConfig = Record<string, string>;

const DEFAULTS: SiteConfig = {
  "hero.title": "Encontrá lo que buscás, ofrecé lo que hacés",
  "hero.subtitle":
    "El marketplace de servicios, autos y propiedades más grande de Argentina. Conectá con miles de compradores y vendedores verificados.",
  "hero.searchPlaceholder": "¿Qué estás buscando? Ej: Plomero, Toyota Corolla, Departamento...",
  "hero.ctaPrimary": "Publicar gratis",
  "hero.ctaSecondary": "Explorar categorías",
  "trust.publications": "48.500+",
  "trust.publicationsLabel": "Publicaciones activas",
  "trust.users": "32.000+",
  "trust.usersLabel": "Usuarios activos",
  "trust.rating": "4.8/5",
  "trust.ratingLabel": "Calificación promedio",
  "cta.title": "¿Listo para empezar?",
  "cta.subtitle":
    "Sumate a miles de argentos que ya están comprando y vendiendo en UMPI. Publicá gratis en 2 minutos.",
  "cta.button": "Publicar ahora",
  "footer.tagline":
    "El marketplace argentino para servicios, autos y propiedades. Conectamos compradores y vendedores verificados.",
  "footer.copyright": "UMPI. Todos los derechos reservados.",
  "newsletter.title": "Recibí las mejores ofertas",
  "newsletter.subtitle": "Suscribite al newsletter y enterate antes que nadie.",
  "newsletter.placeholder": "tu@email.com",
  "newsletter.button": "Suscribirme",
  "cookies.message":
    "Usamos cookies para mejorar tu experiencia. Al continuar navegando, aceptás nuestra política de cookies.",
  "cookies.accept": "Aceptar",
  "cookies.decline": "Rechazar",
  "cookies.learnMore": "Saber más",
  "general.brandName": "UMPI",
  "general.supportEmail": "soporte@umpi.com.ar",
  "general.supportPhone": "+54 11 5555-5555",
  "general.supportWhatsapp": "+54 9 11 5555-5555",
};

// Caché module-level para evitar refetch en cada navegación
let cachedConfig: SiteConfig | null = null;

async function fetchConfig(): Promise<SiteConfig> {
  if (cachedConfig) return cachedConfig;
  const res = await fetch("/api/site-config");
  if (!res.ok) return DEFAULTS;
  const data = await res.json();
  cachedConfig = { ...DEFAULTS, ...(data.config || {}) };
  return cachedConfig;
}

/**
 * Hook para acceder a la configuración del sitio (textos editables desde admin).
 * Cachea en module-level para no refetchear en cada navegación.
 * Refresca automáticamente cada 5 minutos.
 */
export function useSiteConfig() {
  const { data, isLoading } = useQuery({
    queryKey: ["site-config"],
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,
  });

  return {
    config: data || DEFAULTS,
    isLoading,
    get: (key: string, fallback?: string) => data?.[key] ?? fallback ?? DEFAULTS[key] ?? "",
  };
}

/**
 * Invalida la caché de SiteConfig (para forzar refetch después de un cambio).
 */
export function invalidateSiteConfig() {
  cachedConfig = null;
}
