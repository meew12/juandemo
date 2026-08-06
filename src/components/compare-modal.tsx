"use client";

import { useEffect, useState } from "react";
import {
  GitCompare,
  MapPin,
  Star,
  Eye,
  BadgeCheck,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCompare } from "@/components/compare-context";
import {
  formatPriceWithUnit,
  formatViews,
  timeAgo,
  safeJsonParse,
  getInitials,
} from "@/lib/utils-umpi";
import type { Listing } from "@/lib/types";

const OPEN_EVENT = "umpi-compare-open";

type NavigateFn = (page: string, params?: any) => void;

export function CompareModal({ onNavigate }: { onNavigate?: NavigateFn }) {
  const { compareItems } = useCompare();
  const [open, setOpen] = useState(false);

  // Listen for "open" events dispatched by CompareBar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const handleNavigate = (listing: Listing) => {
    setOpen(false);
    onNavigate?.("detail", { slug: listing.slug, id: listing.id });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="sm:max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden bg-[var(--umpi-surface)] border-[var(--umpi-border)]"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--umpi-border)] shrink-0 text-left">
          <DialogTitle className="font-display text-xl flex items-center gap-2 text-[var(--umpi-text)]">
            <GitCompare className="w-5 h-5 text-[var(--umpi-accent)]" />
            Comparar publicaciones
          </DialogTitle>
          <DialogDescription className="text-[var(--umpi-text2)]">
            Compará hasta 3 publicaciones lado a lado.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto flex-1 scrollbar-thin">
          {compareItems.length < 2 ? (
            <EmptyState />
          ) : (
            <ComparisonTable
              listings={compareItems}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto w-14 h-14 grid place-items-center rounded-full bg-[var(--umpi-surface2)] mb-4">
        <Info className="w-7 h-7 text-[var(--umpi-text2)]" />
      </div>
      <h3 className="font-display text-lg text-[var(--umpi-text)] mb-1">
        No hay suficientes publicaciones
      </h3>
      <p className="text-sm text-[var(--umpi-text2)] max-w-sm mx-auto">
        Agregá al menos 2 publicaciones para comparar.
      </p>
    </div>
  );
}

function ComparisonTable({
  listings,
  onNavigate,
}: {
  listings: Listing[];
  onNavigate: (listing: Listing) => void;
}) {
  // Compute best-value highlights (null when all values are equal).
  const lowestPriceId = findMinById(listings, (l) => l.price);
  const highestRatingId = findMaxById(listings, (l) => l.rating);
  const mostViewsId = findMaxById(listings, (l) => l.views);

  // Grid template: first column is the row label, then one column per listing.
  const gridTemplateColumns = `minmax(110px, 160px) repeat(${listings.length}, minmax(180px, 1fr))`;

  return (
    <div
      role="table"
      aria-label="Tabla de comparación"
      className="min-w-max"
      style={{ gridTemplateColumns, display: "grid" }}
    >
      {/* Header row — sticky */}
      {/* Sticky header cells need sticky directly (display: contents on the row removes the box). */}
      <div
        role="rowheader"
        className="bg-[var(--umpi-surface)] sticky top-0 left-0 z-20 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--umpi-text3)] border-b border-[var(--umpi-border)]"
      >
        Publicación
      </div>
      {listings.map((listing) => {
        const images = safeJsonParse<string[]>(listing.images, []);
        const mainImg = images[0] || "";
        return (
          <div
            key={listing.id}
            role="columnheader"
            className="bg-[var(--umpi-surface)] sticky top-0 z-10 px-3 py-3 border-b border-[var(--umpi-border)] min-w-0"
          >
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[var(--umpi-surface2)] mb-2">
              {mainImg ? (
                <img
                  src={mainImg}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-[var(--umpi-text3)] text-xs font-semibold">
                  UMPI
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold text-[var(--umpi-text)] line-clamp-2 leading-snug">
              {listing.title}
            </h3>
          </div>
        );
      })}

      {/* Precio */}
      <RowLabel>Precio</RowLabel>
      {listings.map((listing) => (
        <Cell key={listing.id} highlight={listing.id === lowestPriceId}>
          <span className="font-display text-base text-[var(--umpi-text)]">
            {formatPriceWithUnit(listing.price, listing.currency, listing.priceUnit || undefined)}
          </span>
          {listing.id === lowestPriceId && (
            <Badge className="mt-1 bg-[var(--umpi-green)] text-white text-[10px]">
              Mejor precio
            </Badge>
          )}
        </Cell>
      ))}

      {/* Ubicación */}
      <RowLabel>Ubicación</RowLabel>
      {listings.map((listing) => (
        <Cell key={listing.id}>
          <span className="flex items-center gap-1 text-sm text-[var(--umpi-text2)]">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-2">{listing.location || "Sin zona"}</span>
          </span>
        </Cell>
      ))}

      {/* Calificación */}
      <RowLabel>Calificación</RowLabel>
      {listings.map((listing) => (
        <Cell key={listing.id} highlight={listing.id === highestRatingId}>
          <span className="flex items-center gap-1 text-sm text-[var(--umpi-text)]">
            <Star className="w-3.5 h-3.5 fill-[var(--umpi-gold)] text-[var(--umpi-gold)]" />
            <span className="font-semibold">{listing.rating.toFixed(1)}</span>
            <span className="text-[var(--umpi-text3)] text-xs">({listing.reviewCount})</span>
          </span>
          {listing.id === highestRatingId && (
            <Badge
              className="mt-1 text-white text-[10px]"
              style={{ background: "var(--umpi-gold)" }}
            >
              Mejor valorado
            </Badge>
          )}
        </Cell>
      ))}

      {/* Vistas */}
      <RowLabel>Vistas</RowLabel>
      {listings.map((listing) => (
        <Cell key={listing.id} highlight={listing.id === mostViewsId}>
          <span className="flex items-center gap-1 text-sm text-[var(--umpi-text)]">
            <Eye className="w-3.5 h-3.5 shrink-0" />
            {formatViews(listing.views)}
          </span>
          {listing.id === mostViewsId && (
            <Badge
              className="mt-1 text-white text-[10px]"
              style={{ background: "var(--umpi-purple)" }}
            >
              Más popular
            </Badge>
          )}
        </Cell>
      ))}

      {/* Vendedor */}
      <RowLabel>Vendedor</RowLabel>
      {listings.map((listing) => {
        const sellerName = listing.seller
          ? `${listing.seller.name || ""} ${listing.seller.lastName || ""}`.trim() || "Vendedor"
          : "Vendedor";
        const initials = listing.seller?.avatarInitials || getInitials(sellerName);
        return (
          <Cell key={listing.id}>
            <span className="flex items-center gap-2 text-sm text-[var(--umpi-text)]">
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarFallback
                  className="text-[9px] font-semibold"
                  style={{ background: "var(--umpi-accent)", color: "white", fontSize: "9px" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="line-clamp-1">{sellerName}</span>
            </span>
          </Cell>
        );
      })}

      {/* Verificado */}
      <RowLabel>Verificado</RowLabel>
      {listings.map((listing) => (
        <Cell key={listing.id}>
          {listing.seller?.verified ? (
            <span className="inline-flex items-center gap-1 text-sm text-[var(--umpi-green)] font-medium">
              <BadgeCheck className="w-4 h-4" />
              Verificado
            </span>
          ) : (
            <span className="text-sm text-[var(--umpi-text3)]">No verificado</span>
          )}
        </Cell>
      ))}

      {/* Categoría */}
      <RowLabel>Categoría</RowLabel>
      {listings.map((listing) => (
        <Cell key={listing.id}>
          <Badge
            variant="secondary"
            className="text-[10px] bg-[var(--umpi-surface2)] text-[var(--umpi-text2)]"
          >
            {listing.categoryType === "servicio"
              ? "Servicio"
              : listing.categoryType === "auto"
              ? "Vehículo"
              : "Propiedad"}
            {listing.category?.name ? ` · ${listing.category.name}` : ""}
          </Badge>
        </Cell>
      ))}

      {/* Publicado */}
      <RowLabel>Publicado</RowLabel>
      {listings.map((listing) => (
        <Cell key={listing.id}>
          <span className="text-sm text-[var(--umpi-text2)]">{timeAgo(listing.createdAt)}</span>
        </Cell>
      ))}

      {/* Ver publicación */}
      <RowLabel isLast>Acción</RowLabel>
      {listings.map((listing) => (
        <Cell key={listing.id} isLast>
          <Button
            type="button"
            size="sm"
            onClick={() => onNavigate(listing)}
            className="w-full bg-[var(--umpi-accent)] text-white hover:opacity-90"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Ver publicación
          </Button>
        </Cell>
      ))}
    </div>
  );
}

function RowLabel({ children, isLast = false }: { children: React.ReactNode; isLast?: boolean }) {
  return (
    <div
      role="rowheader"
      className={`bg-[var(--umpi-surface)] sticky left-0 z-10 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--umpi-text3)] border-b border-[var(--umpi-border)] ${
        isLast ? "border-b-0" : ""
      }`}
    >
      {children}
    </div>
  );
}

function Cell({
  children,
  highlight = false,
  isLast = false,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      role="cell"
      className={`px-3 py-3 border-b border-[var(--umpi-border)] min-w-0 ${
        isLast ? "border-b-0" : ""
      } ${highlight ? "bg-[rgba(232,76,30,0.04)]" : ""}`}
    >
      <div className="flex flex-col items-start gap-0.5">{children}</div>
    </div>
  );
}

/**
 * Return the id of the item with the minimum value for `selector`.
 * Returns null when all values are equal or list has fewer than 2 items.
 */
function findMinById<T extends { id: string }, V extends number>(
  items: T[],
  selector: (item: T) => V
): string | null {
  if (items.length < 2) return null;
  let minItem = items[0];
  let allEqual = true;
  for (const item of items) {
    if (selector(item) < selector(minItem)) {
      minItem = item;
      allEqual = false;
    } else if (selector(item) !== selector(minItem)) {
      allEqual = false;
    }
  }
  return allEqual ? null : minItem.id;
}

/**
 * Return the id of the item with the maximum value for `selector`.
 * Returns null when all values are equal or list has fewer than 2 items.
 */
function findMaxById<T extends { id: string }, V extends number>(
  items: T[],
  selector: (item: T) => V
): string | null {
  if (items.length < 2) return null;
  let maxItem = items[0];
  let allEqual = true;
  for (const item of items) {
    if (selector(item) > selector(maxItem)) {
      maxItem = item;
      allEqual = false;
    } else if (selector(item) !== selector(maxItem)) {
      allEqual = false;
    }
  }
  return allEqual ? null : maxItem.id;
}
