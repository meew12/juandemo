"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Star, Eye, BadgeCheck, MessageCircle, Phone, Heart, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatPriceWithUnit, formatViews, safeJsonParse, timeAgo, getInitials } from "@/lib/utils-umpi";
import type { Listing } from "@/lib/types";

interface QuickViewModalProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToDetail: (slug: string) => void;
  onContact?: (listing: Listing) => void;
  onToggleFavorite?: (id: string) => void;
}

// Fetch the user's favorites list (just IDs) so we can sync the heart state
// across all listing cards and the Quick View modal.
async function fetchFavoriteIds(): Promise<Set<string>> {
  const res = await fetch("/api/favorites");
  if (!res.ok) return new Set();
  const data = await res.json();
  return new Set((data.favorites || []).map((f: any) => f.listingId));
}

export function QuickViewModal({
  listing,
  open,
  onOpenChange,
  onNavigateToDetail,
  onContact,
  onToggleFavorite,
}: QuickViewModalProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [prevListingId, setPrevListingId] = useState<string | undefined>(listing?.id);

  // Fetch the user's favorite IDs so the heart reflects the real persisted state
  const { data: favoriteIds } = useQuery({
    queryKey: ["favorites-ids"],
    queryFn: fetchFavoriteIds,
    enabled: !!session,
  });

  const favMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate both the IDs query and the full favorites list query
      queryClient.invalidateQueries({ queryKey: ["favorites-ids"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorites-count"] });
      toast.success(data.favorited ? "Guardado en favoritos ❤" : "Eliminado de favoritos", { duration: 2000 });
    },
    onError: () => {
      toast.error("Iniciá sesión para guardar favoritos");
    },
  });

  // Reset image index when listing changes — render-time adjustment pattern
  // (avoids setState-in-effect lint rule; see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  if (listing?.id !== prevListingId) {
    setPrevListingId(listing?.id);
    setCurrentImageIndex(0);
  }

  if (!listing) return null;

  // Use the global favorites state if available, otherwise fall back to local state
  const isFavorite = favoriteIds ? favoriteIds.has(listing.id) : false;

  const images = safeJsonParse<string[]>(listing.images, []);
  const displayImages = images.length > 0 ? images : ["https://via.placeholder.com/800x600?text=UMPI"];
  const currentImage = displayImages[currentImageIndex] || displayImages[0];

  const sellerName = listing.seller
    ? `${listing.seller.name || ""} ${listing.seller.lastName || ""}`.trim() || "Vendedor"
    : "Vendedor";
  const sellerInitials = listing.seller?.avatarInitials || getInitials(sellerName);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((i) => (i - 1 + displayImages.length) % displayImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((i) => (i + 1) % displayImages.length);
  };

  const handleFavorite = () => {
    favMutation.mutate(listing.id);
    onToggleFavorite?.(listing.id);
  };

  const handleContact = () => {
    onContact?.(listing);
    onOpenChange(false);
  };

  const handleViewFullDetail = () => {
    onOpenChange(false);
    onNavigateToDetail(listing.slug || listing.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{listing.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Vista rápida de {listing.title}
        </DialogDescription>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image gallery - left side */}
          <div className="relative aspect-[4/3] md:aspect-auto md:h-full bg-[var(--umpi-surface2)]">
            <img
              src={currentImage}
              alt={listing.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 35%" }}
            />

            {/* Top badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              {listing.badge === "featured" && (
                <Badge className="bg-[var(--umpi-gold)] text-white text-[10px] gap-1 px-2 py-0.5">
                  <Star className="w-3 h-3 fill-current" /> Destacado
                </Badge>
              )}
              {listing.badge === "new" && (
                <Badge className="bg-[var(--umpi-green)] text-white text-[10px] px-2 py-0.5">Nuevo</Badge>
              )}
              {listing.badge === "hot" && (
                <Badge className="bg-[var(--umpi-accent)] text-white text-[10px] px-2 py-0.5">Popular</Badge>
              )}
            </div>

            {/* Favorite button */}
            <button
              onClick={handleFavorite}
              aria-label="Guardar en favoritos"
              className="absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full bg-white/95 backdrop-blur hover:bg-white shadow-sm transition-all"
            >
              <Heart
                className={`w-4 h-4 transition-all ${
                  isFavorite ? "fill-[var(--umpi-accent)] text-[var(--umpi-accent)]" : "text-[var(--umpi-text2)]"
                }`}
              />
            </button>

            {/* Image navigation */}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-white/95 backdrop-blur shadow-md hover:bg-white transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-[var(--umpi-text)]" />
                </button>
                <button
                  onClick={handleNextImage}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-white/95 backdrop-blur shadow-md hover:bg-white transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-[var(--umpi-text)]" />
                </button>

                {/* Image counter */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-medium">
                  {currentImageIndex + 1} / {displayImages.length}
                </div>
              </>
            )}
          </div>

          {/* Details - right side */}
          <div className="flex flex-col p-5 sm:p-6 overflow-y-auto">
            <p className="text-[11px] text-[var(--umpi-text2)] mb-1 uppercase tracking-wide font-semibold">
              {listing.categoryType === "servicio" ? "Servicio" : listing.categoryType === "auto" ? "Vehículo" : "Propiedad"}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--umpi-text)] mb-2 leading-tight">
              {listing.title}
            </h2>

            {/* Rating + location row */}
            <div className="flex items-center gap-3 text-xs text-[var(--umpi-text2)] mb-4">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[var(--umpi-gold)] text-[var(--umpi-gold)]" />
                <span className="font-semibold text-[var(--umpi-text)]">{listing.rating.toFixed(1)}</span>
                <span className="text-[var(--umpi-text3)]">({listing.reviewCount} reseñas)</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[var(--umpi-text3)]" />
                <span className="font-medium truncate max-w-[160px]">{listing.location || "Sin zona"}</span>
              </span>
              <span className="flex items-center gap-1 ml-auto text-[var(--umpi-text3)]">
                <Eye className="w-3.5 h-3.5" />
                {formatViews(listing.views)}
              </span>
            </div>

            {/* Price */}
            <div className="bg-[var(--umpi-accent-soft)]/50 rounded-xl p-4 mb-4">
              <p className="text-xs text-[var(--umpi-text2)] mb-1 font-medium">Precio</p>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-[var(--umpi-accent)]">
                {formatPriceWithUnit(listing.price, listing.currency, listing.priceUnit || undefined)}
              </p>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--umpi-text2)] mb-1.5 uppercase tracking-wide">
                  Descripción
                </p>
                <p className="text-sm text-[var(--umpi-text2)] leading-relaxed line-clamp-4">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Seller card */}
            {listing.seller && (
              <div className="bg-[var(--umpi-surface2)] rounded-xl p-3 mb-4 flex items-center gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{ background: "var(--umpi-accent)", color: "white" }}
                  >
                    {sellerInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-[var(--umpi-text)] truncate">{sellerName}</p>
                    {listing.seller.verified && (
                      <BadgeCheck className="w-4 h-4 text-[var(--umpi-green)] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--umpi-text3)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Publicado {timeAgo(listing.createdAt)}
                  </p>
                </div>
                {listing.seller.plan && listing.seller.plan !== "basico" && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 shrink-0"
                    style={{ background: "var(--umpi-purple-soft)", color: "var(--umpi-purple)" }}
                  >
                    {listing.seller.plan === "pro" ? "Pro" : "Business"}
                  </Badge>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-auto flex flex-col gap-2">
              <Button
                onClick={handleContact}
                className="w-full py-3 text-sm font-medium bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Contactar vendedor
              </Button>
              <div className="grid grid-cols-2 gap-2">
                {listing.seller?.phone && (
                  <Button
                    variant="outline"
                    onClick={() => toast.info(`Teléfono: ${listing.seller!.phone}`)}
                    className="py-2.5 text-xs font-medium border-[var(--umpi-border)] hover:bg-[var(--umpi-surface2)] gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Ver teléfono
                  </Button>
                )}
                <Button
                  onClick={handleViewFullDetail}
                  variant="outline"
                  className="py-2.5 text-xs font-medium border-[var(--umpi-accent)] text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent)] hover:text-white gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver detalle completo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
