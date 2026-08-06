import type { Metadata } from "next";

const SITE_URL = "https://umpi.com.ar";
const SITE_NAME = "UMPI";

/**
 * Safely parse a JSON string field (listing.images / listing.attrs),
 * returning a default value on any error.
 */
function safeJsonArray<T = string>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Generate per-listing Metadata for SEO + social sharing.
 *
 * Used by detail pages to populate <title>, meta description, Open Graph
 * and Twitter card tags with the specific listing data (title, first image,
 * description excerpt).
 */
export function generateListingMeta(listing: {
  title: string;
  description?: string;
  images?: string;
  price?: number;
  currency?: string;
  slug?: string;
}): Metadata {
  const images = safeJsonArray<string>(listing.images);
  const description = (listing.description || "").slice(0, 160);
  const ogImage = images[0]
    ? images[0].startsWith("http")
      ? images[0]
      : `${SITE_URL}${images[0]}`
    : undefined;

  return {
    title: `${listing.title} — ${SITE_NAME}`,
    description: description || `${listing.title} en ${SITE_NAME}`,
    alternates: {
      canonical: listing.slug ? `/lista/${listing.slug}` : undefined,
    },
    openGraph: {
      title: `${listing.title} — ${SITE_NAME}`,
      description: description,
      type: "article",
      url: listing.slug ? `${SITE_URL}/lista/${listing.slug}` : SITE_URL,
      siteName: SITE_NAME,
      locale: "es_AR",
      images: ogImage ? [{ url: ogImage, alt: listing.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${listing.title} — ${SITE_NAME}`,
      description: description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/**
 * Generate marketplace-section Metadata for /servicios, /autos, /propiedades
 * landing pages. Optionally includes a search query in the title.
 */
export function generateMarketplaceMeta(
  type: "servicios" | "autos" | "propiedades",
  query?: string
): Metadata {
  const labels: Record<typeof type, { title: string; description: string; path: string }> = {
    servicios: {
      title: "Servicios",
      description:
        "Encontrá los mejores servicios profesionales en Argentina: plomería, electricidad, diseño, desarrollo web, clases particulares y más. Contratá directamente con el profesional.",
      path: "/servicios",
    },
    autos: {
      title: "Autos",
      description:
        "Comprá y vendé autos usados y 0km en Argentina. Toyota, Volkswagen, Ford, Renault, Honda y más marcas con precios en pesos y financiación.",
      path: "/autos",
    },
    propiedades: {
      title: "Propiedades",
      description:
        "Departamentos, casas, PH y terrenos en venta y alquiler en Argentina. Encontrá tu próxima propiedad en CABA, GBA, Córdoba, Rosario y más.",
      path: "/propiedades",
    },
  };

  const meta = labels[type];
  const title = query
    ? `${meta.title}: ${query} — ${SITE_NAME}`
    : `${meta.title} en Argentina — ${SITE_NAME}`;

  return {
    title,
    description: meta.description,
    alternates: {
      canonical: meta.path,
    },
    openGraph: {
      title,
      description: meta.description,
      type: "website",
      url: `${SITE_URL}${meta.path}`,
      siteName: SITE_NAME,
      locale: "es_AR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: meta.description,
    },
  };
}
