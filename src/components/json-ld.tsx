import * as React from "react";

/**
 * JSON-LD structured data component for a single listing.
 *
 * Renders a <script type="application/ld+json"> tag with schema.org Product
 * + Offer (+ optional AggregateRating) markup so search engines (Google,
 * Bing) can build rich results (price snippets, ratings, images).
 *
 * This is a Server Component (no "use client") so it ships zero JS.
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

export interface ListingJsonLdProps {
  listing: {
    title: string;
    description?: string;
    images?: string;
    price?: number;
    currency?: string;
    rating?: number;
    reviewCount?: number;
    slug?: string;
    status?: string;
  };
}

export function ListingJsonLd({ listing }: ListingJsonLdProps) {
  if (!listing) return null;

  const images = safeJsonArray<string>(listing.images);
  const firstImage = images[0]
    ? images[0].startsWith("http")
      ? images[0]
      : `https://umpi.com.ar${images[0]}`
    : undefined;

  const outOfStock = listing.status && listing.status !== "active";

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: (listing.description || "").slice(0, 5000),
  };

  if (firstImage) {
    schema.image = [firstImage];
  }

  if (typeof listing.price === "number") {
    schema.offers = {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: listing.currency || "ARS",
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: listing.slug ? `https://umpi.com.ar/?page=detail&slug=${listing.slug}` : undefined,
    };
  }

  if (typeof listing.rating === "number" && listing.rating > 0 && (listing.reviewCount ?? 0) > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: listing.rating,
      reviewCount: listing.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
