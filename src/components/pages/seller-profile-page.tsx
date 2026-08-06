"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  BadgeCheck,
  Crown,
  MapPin,
  Calendar,
  LayoutList,
  Eye,
  Star,
  MessageSquare,
  Store,
  MessageCircle,
  Shield,
  TrendingUp,
  Award,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  formatDate,
  formatViews,
  getInitials,
} from "@/lib/utils-umpi";
import { ListingCard } from "@/components/listing-card";
import { ListingCardSkeleton } from "@/components/skeletons";
import type { Listing, Review } from "@/lib/types";

interface SellerProfileResponse {
  user: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarInitials: string | null;
    verified: boolean;
    plan: string;
    zone: string | null;
    bio: string | null;
    memberSince: string;
    createdAt: string;
  };
  stats: {
    totalListings: number;
    totalViews: number;
    avgRating: number;
    totalReviews: number;
  };
  listings: Listing[];
  reviews: (Review & {
    listing?: { id: string; title: string; slug: string } | null;
  })[];
}

interface ReputationResponse {
  score: number;
  level: string;
  breakdown: {
    rating: number;
    verified: number;
    plan: number;
    reviews: number;
    age: number;
  };
}

async function fetchSeller(id: string): Promise<SellerProfileResponse> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Error al cargar el perfil");
  }
  return res.json();
}

async function fetchReputation(id: string): Promise<ReputationResponse> {
  const res = await fetch(`/api/users/${id}/reputation`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Error al cargar reputación");
  }
  return res.json();
}

function getLevelColor(level: string) {
  switch (level) {
    case "Premium":
      return { bg: "#7c3aed", text: "#ffffff", ring: "#7c3aed" };
    case "Destacado":
      return { bg: "#c49a2a", text: "#ffffff", ring: "#c49a2a" };
    case "Confiable":
      return { bg: "#1a7a4a", text: "#ffffff", ring: "#1a7a4a" };
    default:
      return { bg: "#9ca3af", text: "#ffffff", ring: "#9ca3af" };
  }
}

function getScoreColor(score: number) {
  if (score >= 81) return "#7c3aed";
  if (score >= 61) return "#c49a2a";
  if (score >= 31) return "#1a7a4a";
  return "#9ca3af";
}

function CircularProgress({
  score,
  size = 80,
  strokeWidth = 6,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--umpi-surface2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display text-lg font-bold"
          style={{ color }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  max,
  icon: Icon,
}: {
  label: string;
  value: number;
  max: number;
  icon: React.ElementType;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-[var(--umpi-text2)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-[var(--umpi-text2)]">{label}</span>
          <span className="text-xs font-medium text-[var(--umpi-text)]">
            {value}/{max}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--umpi-surface2)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              backgroundColor: "var(--umpi-accent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function SellerProfilePage({
  sellerId,
  onNavigate,
}: {
  sellerId: string;
  onNavigate: (page: string, params?: any) => void;
}) {
  const { data: session } = useSession();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["seller-profile", sellerId],
    queryFn: () => fetchSeller(sellerId),
    enabled: !!sellerId,
    retry: false,
  });

  const { data: reputation } = useQuery({
    queryKey: ["seller-reputation", sellerId],
    queryFn: () => fetchReputation(sellerId),
    enabled: !!sellerId,
    retry: false,
  });

  const isOwnProfile = !!session?.user?.id && session.user.id === sellerId;

  const planBadge = (() => {
    const plan = data?.user.plan || "basico";
    if (plan === "pro")
      return {
        label: "Pro",
        color: "var(--umpi-purple)",
        bg: "var(--umpi-purple-soft)",
      };
    if (plan === "business")
      return {
        label: "Business",
        color: "var(--umpi-purple)",
        bg: "var(--umpi-purple-soft)",
      };
    return {
      label: "Básico",
      color: "var(--umpi-text2)",
      bg: "var(--umpi-surface2)",
    };
  })();

  const handleContact = () => {
    if (!session?.user?.id) {
      toast.info("Iniciá sesión para contactar al vendedor");
      return;
    }
    onNavigate("mensajes", { sellerId });
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      onNavigate("home");
    }
  };

  if (!sellerId) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-16 text-center">
        <p className="text-[var(--umpi-text2)]">
          No se especificó un vendedor.
        </p>
        <Button
          onClick={() => onNavigate("home")}
          className="mt-4 bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white"
        >
          Volver al inicio
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
        {/* Header card skeleton */}
        <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-24 h-24 rounded-full bg-[var(--umpi-surface2)] animate-pulse shrink-0" />
            <div className="flex-1 space-y-3 w-full">
              <div className="h-7 w-64 bg-[var(--umpi-surface2)] animate-pulse rounded" />
              <div className="h-4 w-40 bg-[var(--umpi-surface2)] animate-pulse rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-[var(--umpi-surface2)] animate-pulse rounded-full" />
                <div className="h-5 w-24 bg-[var(--umpi-surface2)] animate-pulse rounded-full" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-[var(--umpi-surface2)] rounded-lg p-3 h-20 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-16 text-center">
        <p className="text-[var(--umpi-text2)] mb-4">
          {(error as Error)?.message ||
            "No pudimos cargar el perfil del vendedor."}
        </p>
        <Button
          onClick={handleBack}
          variant="outline"
          className="border-[var(--umpi-border)] gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
      </div>
    );
  }

  const { user, stats, listings, reviews } = data;
  const fullName = [user.name, user.lastName].filter(Boolean).join(" ") || "Vendedor";
  const initials = user.avatarInitials || getInitials(fullName);

  const levelColors = reputation
    ? getLevelColor(reputation.level)
    : null;

  const statsCards = [
    {
      icon: LayoutList,
      label: "Publicaciones",
      value: stats.totalListings,
    },
    {
      icon: Eye,
      label: "Vistas totales",
      value: formatViews(stats.totalViews),
    },
    {
      icon: Star,
      label: "Calificación prom.",
      value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} / 5` : "—",
    },
    {
      icon: MessageSquare,
      label: "Reseñas recibidas",
      value: stats.totalReviews,
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] umpi-transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      {/* Header card */}
      <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <Avatar className="w-24 h-24 border-4 border-[var(--umpi-accent)] shrink-0">
            <AvatarFallback
              className="text-3xl font-semibold bg-[var(--umpi-accent)] text-white"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-display text-2xl sm:text-3xl text-[var(--umpi-text)]">
                {fullName}
              </h1>
              {user.verified && (
                <BadgeCheck
                  className="w-6 h-6 text-[var(--umpi-green)] shrink-0"
                  aria-label="Vendedor verificado"
                />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge style={{ background: planBadge.bg, color: planBadge.color }}>
                {planBadge.label !== "Básico" && <Crown className="w-3 h-3 mr-1" />}
                Plan {planBadge.label}
              </Badge>
              {levelColors && reputation && (
                <Badge
                  style={{
                    background: levelColors.bg,
                    color: levelColors.text,
                  }}
                  className="gap-1"
                >
                  <Shield className="w-3 h-3" />
                  {reputation.level}
                </Badge>
              )}
              {user.zone && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--umpi-text2)]">
                  <MapPin className="w-3.5 h-3.5" />
                  {user.zone}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-[var(--umpi-text3)]">
                <Calendar className="w-3.5 h-3.5" />
                Miembro desde {formatDate(user.memberSince || user.createdAt)}
              </span>
            </div>

            {user.bio ? (
              <p className="text-sm text-[var(--umpi-text2)] leading-relaxed max-w-2xl">
                {user.bio}
              </p>
            ) : (
              <p className="text-sm text-[var(--umpi-text3)] italic">
                Este vendedor aún no completó su biografía.
              </p>
            )}

            {!isOwnProfile && (
              <div className="mt-4">
                <Button
                  onClick={handleContact}
                  className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contactar
                </Button>
              </div>
            )}
          </div>

          {/* Reputation circular score */}
          {reputation && (
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <CircularProgress score={reputation.score} />
              <span className="text-xs text-[var(--umpi-text2)] font-medium">
                Reputación
              </span>
            </div>
          )}
        </div>

        {/* Reputation breakdown */}
        {reputation && (
          <div className="mt-5 p-4 bg-[var(--umpi-surface2)] rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-[var(--umpi-accent)]" />
              <h3 className="text-sm font-semibold text-[var(--umpi-text)]">
                Desglose de reputación
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <BreakdownBar
                label="Calificación"
                value={reputation.breakdown.rating}
                max={40}
                icon={Star}
              />
              <BreakdownBar
                label="Verificación"
                value={reputation.breakdown.verified}
                max={15}
                icon={BadgeCheck}
              />
              <BreakdownBar
                label="Plan"
                value={reputation.breakdown.plan}
                max={15}
                icon={Crown}
              />
              <BreakdownBar
                label="Reseñas"
                value={reputation.breakdown.reviews}
                max={15}
                icon={TrendingUp}
              />
              <BreakdownBar
                label="Antigüedad"
                value={reputation.breakdown.age}
                max={15}
                icon={Clock}
              />
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {statsCards.map((s) => (
            <div
              key={s.label}
              className="bg-[var(--umpi-surface2)] rounded-lg p-3 text-center"
            >
              <s.icon className="w-4 h-4 mx-auto mb-1 text-[var(--umpi-accent)]" />
              <p className="font-display text-xl text-[var(--umpi-text)]">
                {s.value}
              </p>
              <p className="text-xs text-[var(--umpi-text2)]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 max-w-md">
          <TabsTrigger value="listings" className="gap-1.5">
            <LayoutList className="w-4 h-4" />
            <span>Publicaciones ({listings.length})</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5">
            <MessageSquare className="w-4 h-4" />
            <span>Reseñas ({reviews.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          {listings.length === 0 ? (
            <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-10 text-center">
              <Store className="w-10 h-10 text-[var(--umpi-text3)] mx-auto mb-3" />
              <p className="text-[var(--umpi-text2)]">
                Este vendedor no tiene publicaciones activas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onClick={() =>
                    onNavigate("detail", { id: listing.id, slug: listing.slug })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews">
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            {reviews.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-10 h-10 text-[var(--umpi-text3)] mx-auto mb-3" />
                <p className="text-[var(--umpi-text2)]">
                  Este vendedor todavía no recibió reseñas.
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin pr-2 space-y-3">
                {reviews.map((review) => {
                  const reviewerName =
                    [review.user?.name, review.user?.lastName]
                      .filter(Boolean)
                      .join(" ") || "Usuario";
                  const reviewerInitials =
                    review.user?.avatarInitials || getInitials(reviewerName);
                  return (
                    <div
                      key={review.id}
                      className="flex gap-3 p-3 border border-[var(--umpi-border)] rounded-lg"
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback
                          className="bg-[var(--umpi-surface2)] text-[var(--umpi-text)] text-sm font-medium"
                          style={{ fontFamily: "var(--font-sora)" }}
                        >
                          {reviewerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-[var(--umpi-text)]">
                            {reviewerName}
                          </p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < review.rating
                                    ? "fill-[var(--umpi-gold)] text-[var(--umpi-gold)]"
                                    : "text-[var(--umpi-border)]"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.listing && (
                          <button
                            onClick={() =>
                              onNavigate("detail", {
                                id: review.listing!.id,
                                slug: review.listing!.slug,
                              })
                            }
                            className="block text-xs text-[var(--umpi-accent)] hover:underline mb-1 text-left"
                          >
                            sobre: {review.listing.title}
                          </button>
                        )}
                        <p className="text-sm text-[var(--umpi-text2)] leading-relaxed">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
