"use client";

import { useState } from "react";
import { Heart, MapPin, Eye, Star, BadgeCheck, Flame, Clock, GitCompare, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useCompare } from "@/components/compare-context";
import { formatPriceWithUnit, formatViews, safeJsonParse, timeAgo, getInitials } from "@/lib/utils-umpi";
import type { Listing } from "@/lib/types";

export function ListingCard({
  listing,
  onClick,
  onToggleFav,
  isFavorite,
  compact = false,
  onQuickView,
}: {
  listing: Listing;
  onClick?: () => void;
  onToggleFav?: (id: string) => void;
  isFavorite?: boolean;
  compact?: boolean;
  onQuickView?: () => void;
}) {
  const [fav, setFav] = useState(isFavorite || false);
  const [heartPulse, setHeartPulse] = useState(false);
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const images = safeJsonParse<string[]>(listing.images, []);
  const mainImg = images[0] || "https://via.placeholder.com/400x300?text=UMPI";
  const hasMultipleImages = images.length > 1;
  const compared = isInCompare(listing.id);

  const sellerName = listing.seller
    ? `${listing.seller.name || ""} ${listing.seller.lastName || ""}`.trim() || "Vendedor"
    : "Vendedor";
  const sellerInitials = listing.seller?.avatarInitials || getInitials(sellerName);

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFav = !fav;
    setFav(newFav);
    if (newFav) {
      setHeartPulse(true);
      setTimeout(() => setHeartPulse(false), 600);
    }
    onToggleFav?.(listing.id);
    toast.success(newFav ? "Guardado en favoritos ❤" : "Eliminado de favoritos", {
      duration: 2000,
    });
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (compared) {
      removeFromCompare(listing.id);
    } else {
      addToCompare(listing);
    }
  };

  return (
    <article
      onClick={onClick}
      className={`group bg-[var(--umpi-surface)] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_16px_48px_rgba(26,22,18,0.14)] hover:-translate-y-1.5 ${
        listing.featured
          ? "border-[var(--umpi-gold)]/30 shadow-[0_4px_16px_rgba(196,154,42,0.12)]"
          : "border-[var(--umpi-border)] shadow-[0_2px_8px_rgba(26,22,18,0.04)]"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--umpi-surface2)]">
        <img
          src={mainImg}
          alt={listing.title}
          loading="eager"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.fallback) {
              target.dataset.fallback = "true";
              target.src = `data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23f0ede8"><rect width="400" height="300"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="%239d9890" text-anchor="middle" dy=".3em">UMPI</text></svg>`
              )}`;
            }
          }}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          style={{ objectPosition: "center 35%" }}
        />
        {/* Featured top accent bar */}
        {listing.featured && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--umpi-gold)] via-[var(--umpi-gold)] to-[var(--umpi-accent)] z-10" />
        )}
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {listing.badge === "featured" && (
            <Badge className="bg-[var(--umpi-gold)] text-white text-[10px] gap-1 px-2 py-0.5 shadow-sm backdrop-blur-sm">
              <Star className="w-3 h-3 fill-current" /> Destacado
            </Badge>
          )}
          {listing.badge === "new" && (
            <Badge className="bg-[var(--umpi-green)] text-white text-[10px] px-2 py-0.5 shadow-sm">Nuevo</Badge>
          )}
          {listing.badge === "hot" && (
            <Badge className="bg-[var(--umpi-accent)] text-white text-[10px] gap-1 px-2 py-0.5 shadow-sm">
              <Flame className="w-3 h-3" /> Popular
            </Badge>
          )}
        </div>

        {/* Image count indicator */}
        {hasMultipleImages && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <span className="flex items-center gap-1 text-[10px] text-white/90 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
              <Eye className="w-3 h-3" />
              {images.length} fotos
            </span>
          </div>
        )}

        {/* Fav button */}
        <button
          onClick={handleFav}
          aria-label="Guardar en favoritos"
          className={`absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-white/90 backdrop-blur hover:bg-white shadow-sm transition-all duration-200 ${
            heartPulse ? "scale-125" : "scale-100"
          }`}
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 ${
              fav
                ? "fill-[var(--umpi-accent)] text-[var(--umpi-accent)] scale-110"
                : "text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)]"
            }`}
          />
        </button>

        {/* Quick view hover button - bottom center of image */}
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView();
            }}
            aria-label="Vista rápida"
            className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-300 bg-white/95 backdrop-blur text-[var(--umpi-text)] text-xs font-medium px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg hover:bg-white hover:shadow-xl"
          >
            <Eye className="w-3.5 h-3.5" />
            Vista rápida
          </button>
        )}

        {/* Time ago indicator - bottom of image */}
        <div className="absolute bottom-2 right-2">
          <span className="flex items-center gap-1 text-[10px] text-white/90 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Clock className="w-3 h-3" />
            {timeAgo(listing.createdAt)}
          </span>
        </div>

        {/* Compare toggle button - bottom-left of image */}
        <button
          onClick={handleCompare}
          aria-label="Comparar"
          aria-pressed={compared}
          title={compared ? "Quitar de comparación" : "Agregar a comparación"}
          className={`absolute bottom-2 left-2 w-8 h-8 grid place-items-center rounded-full shadow-sm transition-all duration-200 ${
            compared
              ? "bg-[var(--umpi-accent)] text-white scale-110 shadow-md"
              : "bg-white/90 backdrop-blur text-[var(--umpi-text2)] hover:bg-white hover:text-[var(--umpi-accent)]"
          }`}
        >
          <GitCompare className="w-4 h-4" />
        </button>
      </div>

      <div className={`p-3 ${compact ? "" : "sm:p-4"}`}>
        {/* Category type label */}
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[10px] text-[var(--umpi-accent)] uppercase tracking-wider font-bold">
            {listing.categoryType === "servicio" ? "Servicio" : listing.categoryType === "auto" ? "Vehículo" : "Propiedad"}
          </p>
          {listing.views > 500 && (
            <span className="flex items-center gap-0.5 text-[9px] text-[var(--umpi-gold)] font-semibold">
              <TrendingUp className="w-2.5 h-2.5" /> Trending
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm leading-snug mb-1.5 line-clamp-2 group-hover:text-[var(--umpi-accent)] transition-colors duration-200">
          {listing.title}
        </h3>
        <p className="font-display text-xl font-bold text-[var(--umpi-text)] mb-2 tracking-tight">
          {formatPriceWithUnit(listing.price, listing.currency, listing.priceUnit || undefined)}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-[var(--umpi-text2)] mb-3">
          <span className="flex items-center gap-0.5">
            <MapPin className="w-3 h-3 text-[var(--umpi-text3)]" />
            <span className="truncate max-w-[120px] font-medium">{listing.location || "Sin zona"}</span>
          </span>
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-[var(--umpi-gold)] text-[var(--umpi-gold)]" />
            <span className="font-semibold text-[var(--umpi-text)]">{listing.rating.toFixed(1)}</span>
            <span className="text-[var(--umpi-text3)]">({listing.reviewCount})</span>
          </span>
          <span className="flex items-center gap-0.5 ml-auto text-[var(--umpi-text3)]">
            <Eye className="w-3 h-3" />
            {formatViews(listing.views)}
          </span>
        </div>

        {/* Seller info row */}
        {listing.seller && (
          <div className="flex items-center gap-2 pt-2.5 border-t border-[var(--umpi-border)]/60">
            <Avatar className="w-6 h-6 shrink-0 ring-1 ring-[var(--umpi-border)]">
              <AvatarFallback
                className="text-[9px] font-semibold"
                style={{
                  background: "var(--umpi-accent)",
                  color: "white",
                  fontSize: "9px",
                }}
              >
                {sellerInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-[var(--umpi-text2)] truncate max-w-[100px] font-medium">
              {sellerName}
            </span>
            {listing.seller.verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-[var(--umpi-green)] shrink-0" />
            )}
            {listing.seller.plan && listing.seller.plan !== "basico" && (
              <Badge
                variant="secondary"
                className="text-[8px] px-1.5 py-0 h-4 ml-auto shrink-0 font-semibold"
                style={{
                  background: "var(--umpi-purple-soft)",
                  color: "var(--umpi-purple)",
                }}
              >
                {listing.seller.plan === "pro" ? "Pro" : "Business"}
              </Badge>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
