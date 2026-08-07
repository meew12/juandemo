"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Share2,
  MapPin,
  Eye,
  Star,
  BadgeCheck,
  Phone,
  MessageCircle,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Home as HomeIcon,
  ShieldCheck,
  Clock,
  Flag,
  Send,
  X,
  User,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Store,
  Info,
  Pencil,
  Headphones,
  Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  formatPriceWithUnit,
  formatViews,
  timeAgo,
  getInitials,
  safeJsonParse,
} from "@/lib/utils-umpi";
import { trackRecentlyViewed } from "@/components/recently-viewed";
import { ShareButton } from "@/components/share-button";
import { ListingCard } from "@/components/listing-card";
import { DetailPageSkeleton } from "@/components/skeletons";
import { ListingJsonLd } from "@/components/json-ld";
import { useWhatsAppStore } from "@/lib/whatsapp-store";
import type { Listing, Review } from "@/lib/types";

async function fetchListing(slug: string) {
  const res = await fetch(`/api/listings/slug/${slug}`);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.listing as Listing & {
    seller: any;
    reviews: Review[];
  };
}

async function fetchReviews(listingId: string) {
  const res = await fetch(`/api/reviews/${listingId}`);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.reviews as (Review & { user: any })[];
}

async function fetchSimilarListings(categoryId: string, listingId: string) {
  const params = new URLSearchParams({ limit: "4" });
  if (categoryId) params.set("category", categoryId);
  const res = await fetch(`/api/listings?${params.toString()}`);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return (data.listings as Listing[]).filter((l) => l.id !== listingId).slice(0, 4);
}

export function DetailPage({
  slug,
  onNavigate,
}: {
  slug: string;
  onNavigate: (page: string, params?: any) => void;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [mainImage, setMainImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState("");

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", slug],
    queryFn: () => fetchListing(slug),
    enabled: !!slug,
  });

  // Track listing view (fire once per listing)
  const viewTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (listing?.id && viewTrackedRef.current !== listing.id) {
      viewTrackedRef.current = listing.id;
      try {
        fetch(`/api/listings/${listing.id}/view`, { method: "POST" });
      } catch {
        // Non-critical tracking call, silently ignore
      }
    }
  }, [listing?.id]);

  const { setWhatsAppData, clearWhatsAppData } = useWhatsAppStore();

  // Sync WhatsApp data to global store for FAB
  useEffect(() => {
    if (listing?.seller?.phone) {
      setWhatsAppData(listing.seller.phone, listing.title);
    } else {
      clearWhatsAppData();
    }
    return () => clearWhatsAppData();
  }, [listing?.seller?.phone, listing?.title, setWhatsAppData, clearWhatsAppData]);

  const { data: reviews } = useQuery({
    queryKey: ["reviews", listing?.id],
    queryFn: () => fetchReviews(listing!.id),
    enabled: !!listing?.id,
  });

  const { data: similarListings } = useQuery({
    queryKey: ["similar", listing?.categoryId, listing?.id],
    queryFn: () => fetchSimilarListings(listing!.categoryId!, listing!.id),
    enabled: !!listing?.categoryId,
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: { rating: number; comment: string }) => {
      const res = await fetch(`/api/reviews/${listing!.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Reseña publicada!");
      setRating(0);
      setReviewText("");
      queryClient.invalidateQueries({ queryKey: ["reviews", listing?.id] });
      queryClient.invalidateQueries({ queryKey: ["listing", slug] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
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
      toast.success(data.favorited ? "Guardado en favoritos" : "Eliminado de favoritos");
    },
    onError: () => {
      toast.error("Inici sesión para guardar favoritos");
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (data: { listingId: string; reason: string; details: string }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Error al enviar el reporte");
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Reporte enviado. Gracias por ayudarnos a mantener UMPI seguro.");
      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al enviar el reporte");
    },
  });

  const handleSubmitReport = () => {
    if (!listing) return;
    if (!reportReason) {
      toast.error("Seleccioná un motivo");
      return;
    }
    reportMutation.mutate({
      listingId: listing.id,
      reason: reportReason,
      details: reportDetails,
    });
  };

  const handleContact = async () => {
    if (!listing) return;
    if (!session?.user?.id) {
      toast.error("Inici sesin para contactar al vendedor");
      return;
    }
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, sellerId: listing.sellerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      toast.success("Conversacin iniciada");
      onNavigate("mensajes");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Parse images/thumbs before early return so callbacks can reference them
  const images = listing ? safeJsonParse<string[]>(listing.images, []) : [];
  const thumbs = listing ? safeJsonParse<string[]>(listing.thumbs, images) : [];

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxPrev, lightboxNext]);

  // Check if listing was recently modified (within 7 days of creation)
  const isRecentlyModified = listing
    ? new Date(listing.updatedAt).getTime() - new Date(listing.createdAt).getTime() > 1000 * 60 * 5 &&
      Date.now() - new Date(listing.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  if (isLoading || !listing) {
    return <DetailPageSkeleton />;
  }

  // Track recently viewed (fire once when listing loads)
  if (typeof window !== "undefined") {
    trackRecentlyViewed(listing.id, listing.slug);
  }

  const attrs = safeJsonParse<Record<string, string>>(listing.attrs, {});
  const seller = listing.seller;

  const categoryPage =
    listing.categoryType === "servicio"
      ? "servicios"
      : listing.categoryType === "auto"
        ? "autos"
        : "propiedades";
  const categoryLabel =
    listing.categoryType === "servicio"
      ? "Servicios"
      : listing.categoryType === "auto"
        ? "Autos"
        : "Propiedades";

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* ── Structured data for SEO (schema.org Product/Offer) ── */}
      <ListingJsonLd
        listing={{
          title: listing.title,
          description: listing.description,
          images: listing.images,
          price: listing.price,
          currency: listing.currency,
          rating: listing.rating,
          reviewCount: listing.reviewCount,
          slug: listing.slug,
          status: listing.status,
        }}
      />

      {/* ── Enhanced Breadcrumb ── */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="cursor-pointer hover:text-[var(--umpi-accent)] flex items-center gap-1"
            >
              <span onClick={() => onNavigate("home")}>
                <HomeIcon className="w-3.5 h-3.5" />
                Inicio
              </span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="w-3.5 h-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="cursor-pointer hover:text-[var(--umpi-accent)] capitalize"
            >
              <span onClick={() => onNavigate(categoryPage)}>
                {categoryLabel}
              </span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {listing.category && (
            <>
              <BreadcrumbSeparator>
                <ChevronRight className="w-3.5 h-3.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink
                  asChild
                  className="cursor-pointer hover:text-[var(--umpi-accent)]"
                >
                  <span onClick={() => onNavigate(categoryPage, { category: listing.category?.slug })}>
                    {listing.category.name}
                  </span>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator>
            <ChevronRight className="w-3.5 h-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[var(--umpi-text)] font-medium line-clamp-1 max-w-[200px] sm:max-w-[300px]">
              {listing.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* ── Main column ── */}
        <div className="space-y-6">
          {/* ── Image Gallery with Lightbox ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl overflow-hidden">
            {/* Main Image */}
            <div
              className="aspect-[4/3] relative bg-[var(--umpi-surface2)] cursor-zoom-in group"
              onClick={() => openLightbox(mainImage)}
            >
              {/* Animated image with crossfade */}
              <img
                key={mainImage}
                src={images[mainImage] || thumbs[0]}
                alt={listing.title}
                className="w-full h-full object-cover animate-fade-in transition-transform duration-500 group-hover:scale-[1.02]"
                style={{ objectPosition: "center 35%" }}
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent pointer-events-none" />

              {listing.badge === "featured" && (
                <Badge className="absolute top-3 left-3 bg-[var(--umpi-gold)] text-white gap-1 shadow-lg">
                  <Star className="w-3 h-3 fill-current" /> Destacado
                </Badge>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  favMutation.mutate(listing.id);
                }}
                className="absolute top-3 right-3 w-10 h-10 grid place-items-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-md umpi-transition"
              >
                <Heart className="w-5 h-5 text-[var(--umpi-accent)]" />
              </button>

              {/* Left arrow — visible on hover */}
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMainImage((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-md umpi-transition opacity-0 group-hover:opacity-100"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-[var(--umpi-text)]" />
                </button>
              )}

              {/* Right arrow — visible on hover */}
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMainImage((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-md umpi-transition opacity-0 group-hover:opacity-100"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="w-5 h-5 text-[var(--umpi-text)]" />
                </button>
              )}

              {/* Image counter badge */}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {mainImage + 1}/{images.length}
                </div>
              )}

              {/* Zoom hint */}
              <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Clic para ampliar
              </div>
            </div>

            {/* Thumbnail Strip */}
            {thumbs.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto scrollbar-thin">
                {thumbs.map((thumb, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImage(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    aria-pressed={mainImage === i}
                    className={`relative aspect-[4/3] w-20 sm:w-24 rounded-lg overflow-hidden border shrink-0 transition-all duration-200 ${
                      mainImage === i
                        ? "ring-2 ring-[var(--umpi-accent)] border-[var(--umpi-accent)] shadow-md"
                        : "border-[var(--umpi-border)] opacity-70 hover:opacity-100 hover:border-[var(--umpi-text3)]"
                    }`}
                  >
                    <img
                      src={thumb}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: "center 35%" }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Lightbox Dialog ── */}
          <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <DialogContent
              className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-[75vw] p-0 bg-black/95 border-none overflow-hidden"
              showCloseButton={false}
            >
              <DialogTitle className="sr-only">
                Galería de imágenes - {listing.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Navegá por las imágenes de la publicación. Usá las flechas del teclado para navegar.
              </DialogDescription>
              <div className="relative flex items-center justify-center min-h-[60vh] sm:min-h-[75vh]">
                {/* Close button */}
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Cerrar galería"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Image counter */}
                <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full font-medium">
                  {lightboxIndex + 1}/{images.length}
                </div>

                {/* Main lightbox image with fade animation */}
                <img
                  key={lightboxIndex}
                  src={images[lightboxIndex] || thumbs[0]}
                  alt={`${listing.title} - Foto ${lightboxIndex + 1}`}
                  className="max-h-[75vh] max-w-full object-contain animate-fade-in"
                />

                {/* Prev arrow */}
                {images.length > 1 && (
                  <button
                    onClick={lightboxPrev}
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                    aria-label="Imagen anterior"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Next arrow */}
                {images.length > 1 && (
                  <button
                    onClick={lightboxNext}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                    aria-label="Imagen siguiente"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                )}

                {/* Thumbnail strip in lightbox */}
                {thumbs.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 backdrop-blur-sm rounded-xl max-w-[90vw] overflow-x-auto scrollbar-thin">
                    {thumbs.map((thumb, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxIndex(i)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                          lightboxIndex === i
                            ? "border-white shadow-lg"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={thumb} alt={`Mini ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Keyboard hint */}
                <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-sm text-white/60 text-xs px-2 py-1 rounded-full hidden sm:block">
                  ← → para navegar
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Title + Meta ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-[var(--umpi-text2)] uppercase tracking-wide font-medium mb-1">
                  {listing.categoryType === "servicio" ? "Servicio" : listing.categoryType === "auto" ? "Vehículo" : "Propiedad"}
                  {listing.category ? ` · ${listing.category.name}` : ""}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl leading-tight mb-2">{listing.title}</h1>
              </div>
              <ShareButton listing={listing} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--umpi-text2)] mb-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[var(--umpi-accent)]" />
                {listing.location || "Sin ubicación"}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {formatViews(listing.views)}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[var(--umpi-gold)] text-[var(--umpi-gold)]" />
                <span className="font-semibold text-[var(--umpi-text)]">{listing.rating.toFixed(1)}</span>
                <span className="text-[var(--umpi-text2)]">({listing.reviewCount} reseñas)</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Publicado {timeAgo(listing.createdAt)}
              </span>
            </div>

            {/* ── Price with indicator ── */}
            <div className="mb-4">
              <p className="text-xs text-[var(--umpi-text2)] uppercase tracking-wide mb-1">
                Precio publicado
              </p>
              <div className="flex items-center gap-2">
                <p className="font-display text-3xl text-[var(--umpi-text)]">
                  {formatPriceWithUnit(listing.price, listing.currency, listing.priceUnit || undefined)}
                </p>
                {isRecentlyModified && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] gap-1 bg-amber-50 text-amber-700 border border-amber-200"
                  >
                    <Pencil className="w-3 h-3" />
                    Precio actualizado
                  </Badge>
                )}
              </div>
              {isRecentlyModified && (
                <p className="text-[11px] text-[var(--umpi-text3)] mt-1">
                  Última actualización {timeAgo(listing.updatedAt)}
                </p>
              )}
            </div>

            <div className="prose prose-sm max-w-none">
              <h3 className="font-semibold text-base mb-2">Descripción</h3>
              <p className="text-[var(--umpi-text2)] whitespace-pre-line leading-relaxed">
                {listing.description}
              </p>
            </div>
          </div>

          {/* ── Atributos ── */}
          {Object.keys(attrs).length > 0 && (
            <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
              <h3 className="font-semibold text-base mb-3">Características</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(attrs).map(([key, value]) => (
                  <div key={key} className="border border-[var(--umpi-border)] rounded-lg p-3">
                    <p className="text-xs text-[var(--umpi-text2)] uppercase tracking-wide mb-0.5">{key}</p>
                    <p className="text-sm font-medium text-[var(--umpi-text)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Ubicación en mapa ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--umpi-accent)]" />
              Ubicación
            </h3>
            <p className="text-sm text-[var(--umpi-text2)] mb-3">
              {listing.location || "Buenos Aires, Argentina"}
            </p>
            <div className="rounded-xl overflow-hidden border border-[var(--umpi-border)] mb-3">
              <iframe
                title="Ubicación en mapa"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-58.53,-34.72,-58.32,-34.53&layer=mapnik&marker=-34.613,-58.425"
                className="w-full h-[220px] border-0"
                loading="lazy"
                allowFullScreen
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[var(--umpi-accent)] text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent)] hover:text-white gap-2 umpi-transition"
              onClick={() => {
                const loc = encodeURIComponent(listing.location || "Buenos Aires, Argentina");
                window.open(`https://www.google.com/maps/search/${loc}`, "_blank");
              }}
            >
              <MapPin className="w-4 h-4" />
              Ver en mapa
            </Button>
          </div>

          {/* ── Reseñas ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">
                Reseñas ({reviews?.length || 0})
              </h3>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[var(--umpi-gold)] text-[var(--umpi-gold)]" />
                <span className="font-semibold">{listing.rating.toFixed(1)}</span>
                <span className="text-sm text-[var(--umpi-text2)]">/ 5</span>
              </div>
            </div>

            {/* Review list */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto scrollbar-thin pr-1">
              {reviews?.length === 0 ? (
                <p className="text-sm text-[var(--umpi-text2)] text-center py-4">
                  Todavía no hay reseñas. Sé el primero en opinar!
                </p>
              ) : (
                reviews?.map((review) => (
                  <div key={review.id} className="flex gap-3 pb-4 border-b border-[var(--umpi-border)] last:border-0 last:pb-0">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-[var(--umpi-accent)] text-white">
                        {review.user?.avatarInitials || getInitials(review.user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-[var(--umpi-text)] truncate">
                          {review.user?.name} {review.user?.lastName}
                        </p>
                        <span className="text-xs text-[var(--umpi-text3)] shrink-0">{timeAgo(review.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mb-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "fill-[var(--umpi-gold)] text-[var(--umpi-gold)]"
                                : "text-[var(--umpi-border)]"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-[var(--umpi-text2)] leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Review form */}
            {session?.user?.id ? (
              <div className="bg-[var(--umpi-surface2)] rounded-xl p-5 border border-[var(--umpi-border)]">
                <h4 className="font-semibold text-sm text-[var(--umpi-text)] mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--umpi-accent)]" />
                  Dejá tu reseña
                </h4>
                <div className="flex items-center gap-1 mb-3 p-3 bg-[var(--umpi-surface)] rounded-lg border border-[var(--umpi-border)]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      onMouseEnter={() => setHoverRating(i + 1)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-md hover:bg-[var(--umpi-accent-soft)] transition-colors"
                      aria-label={`${i + 1} estrella${i > 0 ? "s" : ""}`}
                    >
                      <Star
                        className={`w-7 h-7 transition-all ${
                          i < (hoverRating || rating)
                            ? "fill-[var(--umpi-gold)] text-[var(--umpi-gold)] scale-110"
                            : "text-[var(--umpi-text3)] hover:text-[var(--umpi-gold)]"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-[var(--umpi-text2)] ml-2 font-medium">
                    {rating > 0
                      ? `${rating} estrella${rating > 1 ? "s" : ""}`
                      : hoverRating > 0
                      ? `${hoverRating} estrella${hoverRating > 1 ? "s" : ""}`
                      : "Seleccioná una calificación"}
                  </span>
                </div>
                <Textarea
                  placeholder="Contá tu experiencia con este vendedor o servicio…"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="mb-3 bg-[var(--umpi-surface)] min-h-[100px] border-[var(--umpi-border)] focus-visible:ring-[var(--umpi-accent)] focus-visible:border-[var(--umpi-accent)] resize-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--umpi-text3)]">
                    {reviewText.length}/500 caracteres
                  </span>
                  <Button
                  onClick={() => {
                    if (rating === 0) {
                      toast.error("Seleccioná una calificación");
                      return;
                    }
                    if (reviewText.trim().length < 5) {
                      toast.error("Escribí un comentario más largo");
                      return;
                    }
                    reviewMutation.mutate({ rating, comment: reviewText });
                  }}
                  disabled={reviewMutation.isPending}
                  className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white"
                >
                  {reviewMutation.isPending ? "Publicando…" : "Publicar reseña"}
                </Button>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--umpi-surface2)] rounded-lg p-4 text-center">
                <p className="text-sm text-[var(--umpi-text2)] mb-2">
                  Iniciá sesión para dejar una reseña
                </p>
              </div>
            )}
          </div>

          {/* ── Publicaciones Similares ── */}
          {similarListings && similarListings.length > 0 && (
            <div className="animate-fade-in">
              <Separator className="mb-6 bg-[var(--umpi-border)]" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-[var(--umpi-text)]">
                  Publicaciones similares
                </h2>
                <button
                  onClick={() => onNavigate(categoryPage)}
                  className="text-sm text-[var(--umpi-accent)] hover:underline flex items-center gap-1"
                >
                  Ver más
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {similarListings.map((sim) => (
                  <ListingCard
                    key={sim.id}
                    listing={sim}
                    onClick={() => onNavigate("detail", { slug: sim.slug })}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => onNavigate(categoryPage)}
                  className="border-[var(--umpi-accent)] text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent)] hover:text-white gap-2 umpi-transition"
                >
                  Ver más publicaciones
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar - sticky ── */}
        <aside className="lg:sticky lg:top-[calc(var(--nav-h)+24px)] lg:self-start space-y-4">
          {/* ── Price Card ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-[var(--umpi-text2)] uppercase tracking-wide mb-1">
                Precio publicado
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display text-3xl text-[var(--umpi-text)]">
                  {formatPriceWithUnit(listing.price, listing.currency, listing.priceUnit || undefined)}
                </p>
                {isRecentlyModified && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] gap-1 bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                    Actualizado
                  </Badge>
                )}
              </div>
              {isRecentlyModified && (
                <p className="text-[11px] text-[var(--umpi-text3)] mt-1">
                  Actualizado {timeAgo(listing.updatedAt)}
                </p>
              )}
            </div>

            <Separator className="bg-[var(--umpi-border)]" />

            {/* ── Acciones rápidas ── */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--umpi-text2)] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[var(--umpi-accent)]" />
                Acciones rápidas
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={handleContact}
                  className="w-full py-3 text-sm font-medium bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white gap-2 umpi-transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contactar
                </Button>
                {seller?.phone && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPhone(true);
                      toast.info(`Teléfono: ${seller.phone}`);
                    }}
                    className="w-full py-3 text-sm font-medium border-2 border-[var(--umpi-accent)]/30 text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent-soft)] hover:border-[var(--umpi-accent)] gap-2 umpi-transition"
                  >
                    <Phone className="w-4 h-4" />
                    {showPhone ? seller.phone : "Ver teléfono"}
                  </Button>
                )}
                {seller?.phone ? (
                  <Button
                    onClick={() => {
                      const rawPhone = String(seller.phone).replace(/\D/g, "");
                      const waPhone = rawPhone.startsWith("549") ? rawPhone : `54911${rawPhone}`;
                      const msg = encodeURIComponent(
                        `Hola, vi tu publicación "${listing.title}" en UMPI y me interesa. ¿Está disponible?`
                      );
                      window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank");
                    }}
                    className="w-full py-3 text-sm font-medium bg-[#25D366] hover:bg-[#1fb855] text-white gap-2 umpi-transition"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="w-full py-3 text-sm font-medium bg-[#25D366]/50 text-white/70 gap-2 cursor-not-allowed"
                    title="El vendedor no tiene teléfono configurado"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => favMutation.mutate(listing.id)}
                  className="w-full py-3 text-sm font-medium border-[var(--umpi-border)] hover:bg-[var(--umpi-surface2)] gap-2 umpi-transition"
                >
                  <Heart className="w-4 h-4 text-[var(--umpi-accent)]" />
                  Guardar en favoritos
                </Button>
              </div>
            </div>

            {/* ── Info row ── */}
            <div className="flex items-center justify-center gap-3 text-xs text-[var(--umpi-text2)] pt-1 border-t border-[var(--umpi-border)]">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                Visitas: {formatViews(listing.views)}
              </span>
              <span className="text-[var(--umpi-border)]" aria-hidden>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Publicado: {timeAgo(listing.createdAt)}
              </span>
            </div>
          </div>

          {/* ── Enhanced Seller Card ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-14 h-14 border-2 border-[var(--umpi-accent)] shadow-sm">
                <AvatarFallback className="bg-[var(--umpi-accent)] text-white font-semibold text-lg">
                  {seller?.avatarInitials || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm truncate">
                    {seller?.name} {seller?.lastName}
                  </p>
                  {seller?.verified && (
                    <BadgeCheck className="w-5 h-5 text-[var(--umpi-green)] shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[var(--umpi-text2)]">{seller?.zone}</p>
              </div>
            </div>

            {/* Response time badge */}
            <div className="flex items-center gap-1 text-xs text-[var(--umpi-text2)] mb-2">
              <Clock className="w-3 h-3 text-[var(--umpi-green)]" />
              <span className="font-medium">{seller?.verified ? "Responde en ~1h" : "Responde en ~6h"}</span>
            </div>

            {/* Verification badge — prominent pill */}
            {seller?.verified && (
              <div className="flex items-center gap-2 bg-[var(--umpi-green-soft)] border border-[var(--umpi-green)]/30 rounded-full pl-2 pr-3 py-1.5 mb-3 w-fit">
                <span className="w-5 h-5 rounded-full bg-[var(--umpi-green)] grid place-items-center shrink-0">
                  <BadgeCheck className="w-3.5 h-3.5 text-white" />
                </span>
                <p className="text-xs font-semibold text-[var(--umpi-green)]">
                  Vendedor verificado
                </p>
              </div>
            )}

            {/* Plan badge */}
            {seller?.plan && seller.plan !== "basico" && (
              <Badge
                className="mb-3 text-[10px] gap-1"
                style={{
                  background: "var(--umpi-purple-soft)",
                  color: "var(--umpi-purple)",
                }}
              >
                <Store className="w-3 h-3" />
                Plan {seller.plan === "pro" ? "Pro" : "Business"}
              </Badge>
            )}

            {/* Stats grid — Ventas / Miembro desde */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[var(--umpi-surface2)] rounded-lg p-2.5 text-center">
                <p className="font-display text-lg font-semibold text-[var(--umpi-text)]">
                  {seller?.verified ? Math.max(15, Math.floor(listing.views / 8)) : Math.max(3, Math.floor(listing.views / 20))}
                </p>
                <p className="text-[10px] text-[var(--umpi-text3)] uppercase tracking-wide">Ventas</p>
              </div>
              <div className="bg-[var(--umpi-surface2)] rounded-lg p-2.5 text-center">
                <p className="font-display text-lg font-semibold text-[var(--umpi-text)]">
                  {seller?.memberSince ? new Date(seller.memberSince).getFullYear() : "2023"}
                </p>
                <p className="text-[10px] text-[var(--umpi-text3)] uppercase tracking-wide">Miembro desde</p>
              </div>
            </div>

            {/* Trust signals row */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {seller?.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--umpi-green)] bg-[var(--umpi-green-soft)] rounded-full px-2 py-0.5">
                  <BadgeCheck className="w-3 h-3" />
                  Verificado
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--umpi-accent)] bg-[var(--umpi-accent-soft)] rounded-full px-2 py-0.5">
                <ShieldCheck className="w-3 h-3" />
                Pagos seguros
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--umpi-gold)] bg-[var(--umpi-gold-soft)] rounded-full px-2 py-0.5">
                <Star className="w-3 h-3 fill-current" />
                {listing.rating.toFixed(1)} rating
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full py-3 text-sm font-medium border-2 border-[var(--umpi-accent)] text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent)] hover:text-white gap-2 umpi-transition"
              onClick={() => onNavigate("seller", { id: seller?.id })}
            >
              <User className="w-4 h-4" />
              Ver perfil del vendedor
            </Button>
          </div>

          {/* ── Garantías UMPI ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--umpi-green)]" />
              Garantías UMPI
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {/* Pago seguro */}
              <div className="bg-[var(--umpi-green-soft)] border border-[var(--umpi-green)]/20 rounded-lg p-3">
                <ShieldCheck className="w-5 h-5 text-[var(--umpi-green)] mb-1.5" />
                <p className="text-xs font-semibold text-[var(--umpi-text)] mb-0.5">Pago seguro</p>
                <p className="text-[10px] text-[var(--umpi-text2)] leading-tight">Transacción protegida por Mercado Pago</p>
              </div>
              {/* Verificado — conditional */}
              {seller?.verified && (
                <div className="bg-[var(--umpi-green-soft)] border border-[var(--umpi-green)]/20 rounded-lg p-3">
                  <BadgeCheck className="w-5 h-5 text-[var(--umpi-green)] mb-1.5" />
                  <p className="text-xs font-semibold text-[var(--umpi-text)] mb-0.5">Verificado</p>
                  <p className="text-[10px] text-[var(--umpi-text2)] leading-tight">Identidad verificada</p>
                </div>
              )}
              {/* Reseñas reales */}
              <div className="bg-[var(--umpi-gold-soft)] border border-[var(--umpi-gold)]/20 rounded-lg p-3">
                <Star className="w-5 h-5 text-[var(--umpi-gold)] fill-[var(--umpi-gold)] mb-1.5" />
                <p className="text-xs font-semibold text-[var(--umpi-text)] mb-0.5">Reseñas reales</p>
                <p className="text-[10px] text-[var(--umpi-text2)] leading-tight">Calificaciones verificadas</p>
              </div>
              {/* Soporte 24/7 */}
              <div className="bg-[var(--umpi-accent-soft)] border border-[var(--umpi-accent)]/20 rounded-lg p-3">
                <Headphones className="w-5 h-5 text-[var(--umpi-accent)] mb-1.5" />
                <p className="text-xs font-semibold text-[var(--umpi-text)] mb-0.5">Soporte 24/7</p>
                <p className="text-[10px] text-[var(--umpi-text2)] leading-tight">Asistencia permanente</p>
              </div>
            </div>
          </div>

          {/* ── Compartir publicación ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[var(--umpi-text2)]" />
              Compartir publicación
            </h3>
            <div className="flex items-center gap-2">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href);
                  const text = encodeURIComponent(`Mirá esta publicación en UMPI: ${listing.title}`);
                  window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
                }}
                className="w-10 h-10 rounded-lg grid place-items-center transition-all hover:scale-110 shadow-sm"
                style={{ backgroundColor: "#25D366" }}
                aria-label="Compartir por WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              {/* Facebook */}
              <button
                type="button"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href);
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
                }}
                className="w-10 h-10 rounded-lg grid place-items-center transition-all hover:scale-110 shadow-sm"
                style={{ backgroundColor: "#1877F2" }}
                aria-label="Compartir por Facebook"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
              {/* Twitter/X */}
              <button
                type="button"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href);
                  const text = encodeURIComponent(`Mirá esto en UMPI: ${listing.title}`);
                  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, "_blank");
                }}
                className="w-10 h-10 rounded-lg bg-black grid place-items-center transition-all hover:scale-110 shadow-sm"
                aria-label="Compartir por X"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>
              {/* Copy Link */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    toast.success("Enlace copiado al portapapeles");
                  }).catch(() => {
                    toast.error("No se pudo copiar el enlace");
                  });
                }}
                className="w-10 h-10 rounded-lg bg-[var(--umpi-surface2)] border border-[var(--umpi-border)] grid place-items-center transition-all hover:scale-110 hover:bg-[var(--umpi-border)] shadow-sm"
                aria-label="Copiar enlace"
              >
                <Link className="w-5 h-5 text-[var(--umpi-text2)]" />
              </button>
            </div>
          </div>

          {/* ── Collapsible Safety Tips ── */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4">
            <Accordion type="single" collapsible defaultValue="safety">
              <AccordionItem value="safety" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--umpi-text)]">
                    <ShieldCheck className="w-4 h-4 text-[var(--umpi-green)]" />
                    Consejos de seguridad
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2.5 mt-1">
                    <li className="flex items-start gap-2 text-xs text-[var(--umpi-text2)]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Nunca envíes dinero por adelantado</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-[var(--umpi-text2)]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--umpi-green)] shrink-0 mt-0.5" />
                      <span>Verificá la identidad del vendedor</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-[var(--umpi-text2)]">
                      <Star className="w-3.5 h-3.5 text-[var(--umpi-gold)] shrink-0 mt-0.5" />
                      <span>Revisá las reseñas del vendedor</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-[var(--umpi-text2)]">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Verificá el producto antes de pagar</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-[var(--umpi-text2)]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--umpi-green)] shrink-0 mt-0.5" />
                      <span>Usá Mercado Pago para transacciones</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-[var(--umpi-text2)]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Desconfiá de precios demasiado bajos</span>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* ── Report ── */}
          <div className="flex justify-center pt-1">
            <AlertDialog
              open={reportOpen}
              onOpenChange={(open) => {
                if (open && !session?.user?.id) {
                  toast.error("Iniciá sesión para reportar");
                  return;
                }
                setReportOpen(open);
              }}
            >
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="text-xs text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] flex items-center justify-center gap-1.5 umpi-transition underline-offset-2 hover:underline"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Reportar esta publicación
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-[var(--umpi-accent)]" />
                    Reportar publicación
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Por qué estás reportando esta publicación? Tu reporte será revisado por nuestro equipo de moderación.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3">
                  <RadioGroup
                    value={reportReason}
                    onValueChange={setReportReason}
                    className="gap-2"
                  >
                    {[
                      "Es spam o engaño",
                      "Información falsa o engañosa",
                      "Contenido inapropiado",
                      "Otro motivo",
                    ].map((opt) => (
                      <Label
                        key={opt}
                        htmlFor={`report-${opt}`}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          reportReason === opt
                            ? "border-[var(--umpi-accent)] bg-[var(--umpi-accent)]/5"
                            : "border-[var(--umpi-border)] hover:bg-[var(--umpi-surface2)]"
                        }`}
                      >
                        <RadioGroupItem
                          id={`report-${opt}`}
                          value={opt}
                          className="text-[var(--umpi-accent)]"
                        />
                        <span className="text-sm text-[var(--umpi-text)]">{opt}</span>
                      </Label>
                    ))}
                  </RadioGroup>

                  <div className="space-y-1.5">
                    <Label htmlFor="report-details" className="text-xs text-[var(--umpi-text2)]">
                      Detalles adicionales (opcional)
                    </Label>
                    <Textarea
                      id="report-details"
                      placeholder="Contanos más sobre el problema…"
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="min-h-[80px] resize-none"
                      maxLength={1000}
                    />
                    <p className="text-[10px] text-[var(--umpi-text3)] text-right">
                      {reportDetails.length}/1000
                    </p>
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setReportReason("");
                      setReportDetails("");
                    }}
                  >
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmitReport();
                    }}
                    disabled={reportMutation.isPending || !reportReason}
                    className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reportMutation.isPending ? "Enviando…" : "Enviar reporte"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </aside>
      </div>
    </div>
  );
}
