"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  LayoutList,
  Heart,
  Sparkles,
  Settings,
  Star,
  Eye,
  TrendingUp,
  Plus,
  Edit3,
  Pencil,
  MessageSquare,
  Trash2,
  Pause,
  Play,
  BadgeCheck,
  Mail,
  Phone,
  MapPin,
  Save,
  Crown,
  KeyRound,
  Lock,
  BarChart3,
  FileText,
  Rocket,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  formatPriceWithUnit,
  formatViews,
  formatDate,
  timeAgo,
  safeJsonParse,
} from "@/lib/utils-umpi";
import { ListingCard } from "@/components/listing-card";
import { ProfilePageSkeleton, ListingCardSkeleton } from "@/components/skeletons";
import type { Listing } from "@/lib/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Boost options — must match the prices in /api/mercadopago/boost
const BOOST_OPTIONS: {
  value: "destacado" | "top" | "premium_destacado";
  title: string;
  price: number;
  description: string;
}[] = [
  {
    value: "destacado",
    title: "Destacado · 30 días",
    price: 4990,
    description: "Borde dorado, insignia ⭐ y prioridad en búsquedas por 30 días.",
  },
  {
    value: "top",
    title: "Top · 7 días",
    price: 2990,
    description: "Aparición prioritaria en el top de resultados por 7 días.",
  },
  {
    value: "premium_destacado",
    title: "Premium Destacado · 30 días",
    price: 9990,
    description: "Máxima visibilidad: destacado + top placement por 30 días.",
  },
];

async function fetchMyListings() {
  const res = await fetch("/api/me/listings");
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.listings as Listing[];
}

async function fetchMyFavorites() {
  const res = await fetch("/api/favorites");
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.favorites as { listing: Listing }[];
}

async function fetchMySubscription() {
  const res = await fetch("/api/me/subscription");
  if (!res.ok) throw new Error("Error");
  return res.json();
}

async function fetchMyStats() {
  const res = await fetch("/api/me/stats");
  if (!res.ok) throw new Error("Error");
  return res.json();
}

// ─── Chart configs ───
const statsAreaChartConfig: ChartConfig = {
  views: { label: "Vistas", color: "var(--umpi-accent)" },
};

const ratingDistChartConfig: ChartConfig = {
  "5": { label: "5★", color: "var(--umpi-green)" },
  "4": { label: "4★", color: "var(--umpi-accent)" },
  "3": { label: "3★", color: "var(--umpi-gold)" },
  "2": { label: "2★", color: "var(--umpi-purple)" },
  "1": { label: "1★", color: "#dc2626" },
};

const topListingsChartConfig: ChartConfig = {
  views: { label: "Vistas", color: "var(--umpi-accent)" },
};

const listingPerformanceConfig: ChartConfig = {
  views: { label: "Vistas", color: "var(--umpi-accent)" },
};

// ─── Icon maps ───
const achievementIconMap: Record<string, any> = {
  rocket: Rocket,
  "badge-check": BadgeCheck,
  trophy: Trophy,
  eye: Eye,
  star: Star,
  crown: Crown,
};

const activityIconMap: Record<string, any> = {
  listing_published: FileText,
  review_received: Star,
  favorite_received: Heart,
  plan_upgraded: Crown,
};

const activityIconColor: Record<string, string> = {
  listing_published: "var(--umpi-accent)",
  review_received: "var(--umpi-gold)",
  favorite_received: "var(--umpi-purple)",
  plan_upgraded: "var(--umpi-gold)",
};

export function PerfilPage({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) {
  const { data: session, status, update } = useSession();
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({
    name: "",
    lastName: "",
    phone: "",
    zone: "",
    bio: "",
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // Boost dialog state: which listing the user wants to boost
  const [boostTarget, setBoostTarget] = useState<{ id: string; title: string } | null>(null);
  const [boostType, setBoostType] = useState<"destacado" | "top" | "premium_destacado">("destacado");

  const { data: myListings, isLoading: listingsLoading } = useQuery({
    queryKey: ["my-listings"],
    queryFn: fetchMyListings,
    enabled: !!session?.user?.id,
  });

  const { data: favorites } = useQuery({
    queryKey: ["my-favorites"],
    queryFn: fetchMyFavorites,
    enabled: !!session?.user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: fetchMySubscription,
    enabled: !!session?.user?.id,
  });

  const { data: myStats, isLoading: myStatsLoading } = useQuery({
    queryKey: ["my-stats"],
    queryFn: fetchMyStats,
    enabled: !!session?.user?.id,
  });

  // Load profile data when session loads
  useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfileForm({
        name: data.user.name || "",
        lastName: data.user.lastName || "",
        phone: data.user.phone || "",
        zone: data.user.zone || "",
        bio: data.user.bio || "",
      });
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Listing performance data for horizontal bar chart
  const listingPerformanceData = useMemo(() => {
    if (!myListings || myListings.length === 0) return [];
    const sorted = [...myListings]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((l) => ({
        title: l.title.length > 30 ? l.title.substring(0, 30) + "…" : l.title,
        views: l.views || 0,
        slug: l.slug,
      }));
    return sorted;
  }, [myListings]);

  const listingPerformanceSummary = useMemo(() => {
    if (!myListings || myListings.length === 0) return { totalViews: 0, avgViews: 0, bestListing: null };
    const tv = myListings.reduce((s, l) => s + (l.views || 0), 0);
    const avg = myListings.length > 0 ? Math.round(tv / myListings.length) : 0;
    const best = myListings.reduce((best, l) => ((l.views || 0) > (best.views || 0) ? l : best), myListings[0]);
    return { totalViews: tv, avgViews: avg, bestListing: best };
  }, [myListings]);

  const updateProfile = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al actualizar el perfil");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Perfil actualizado ✓");
      update();
      queryClient.invalidateQueries({ queryKey: ["me-profile"] });
      setEditDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo actualizar el perfil");
    },
  });

  const changePassword = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al cambiar la contraseña");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo cambiar la contraseña");
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
    },
    onSuccess: () => {
      toast.success("Publicación eliminada");
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      setDeleteTargetId(null);
    },
    onError: () => {
      toast.error("No se pudo eliminar la publicación");
    },
  });

  const togglePauseListing = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "active" ? "paused" : "active" }),
      });
      if (!res.ok) throw new Error("Error");
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });

  // Boost an existing listing: creates a pending boost + MP preference,
  // then redirects to MP checkout. The boost activates after payment.
  // When MP isn't configured (demo mode), the response contains
  // `demo_mode: true` and we route to the demo checkout page instead.
  const boostListing = useMutation({
    mutationFn: async ({
      listingId,
      boostType,
    }: {
      listingId: string;
      boostType: "destacado" | "top" | "premium_destacado";
    }) => {
      const res = await fetch("/api/mercadopago/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, boostType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear el impulso");
      }
      return data as {
        init_point?: string;
        demo_mode?: boolean;
        tx_id: string;
        type?: "boost";
        boost_id?: string;
        boost_type?: "destacado" | "top" | "premium_destacado";
        listing_id?: string;
        listing_title?: string;
        amount?: number;
        currency?: string;
        concept?: string;
        message?: string;
      };
    },
    onSuccess: (data) => {
      // Demo mode: route to the demo checkout page
      if (data?.demo_mode === true) {
        toast.info("MercadoPago no está configurado — activaste el modo demo.");
        onNavigate("checkout-demo", data);
        return;
      }
      // Real MP: redirect to checkout
      if (data.init_point) {
        toast.success("Redirigiendo a MercadoPago para pagar el destacado…");
        window.location.href = data.init_point;
        return;
      }
      toast.error("Respuesta inesperada del servidor de pagos.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo iniciar el pago");
    },
  });

  if (status === "loading") {
    return <ProfilePageSkeleton />;
  }

  if (!session?.user?.id) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-16 text-center">
        <User className="w-12 h-12 text-[var(--umpi-text3)] mx-auto mb-4" />
        <h2 className="font-display text-xl mb-2">Iniciá sesión para ver tu perfil</h2>
      </div>
    );
  }

  const userPlan = (session.user as any)?.plan || "basico";

  const planBadge = {
    basico: { label: "Básico", color: "var(--umpi-text2)", bg: "var(--umpi-surface2)" },
    pro: { label: "Pro ⭐", color: "var(--umpi-purple)", bg: "var(--umpi-purple-soft)" },
    business: { label: "Business 🚀", color: "var(--umpi-purple)", bg: "var(--umpi-purple-soft)" },
  }[userPlan as string] || { label: "Básico", color: "var(--umpi-text2)", bg: "var(--umpi-surface2)" };

  // Plan badge for header — only shown if plan !== "basico"
  const headerPlanBadge =
    userPlan !== "basico"
      ? {
          pro: { label: "Pro", color: "var(--umpi-purple)", bg: "var(--umpi-purple-soft)" },
          business: { label: "Business", color: "var(--umpi-gold)", bg: "var(--umpi-gold-soft)" },
        }[userPlan as string] || null
      : null;

  const totalListings = myListings?.length || 0;
  const totalViews = myListings?.reduce((s, l) => s + (l.views || 0), 0) || 0;
  const reviewedListings = myListings?.filter((l) => (l.reviewCount || 0) > 0) || [];
  const avgRating =
    reviewedListings.length > 0
      ? Math.round(
          (reviewedListings.reduce(
            (s, l) => s + l.rating * (l.reviewCount || 1),
            0
          ) /
            reviewedListings.reduce((s, l) => s + (l.reviewCount || 0), 0)) *
            10
        ) / 10
      : 0;

  // Profile completion calculation
  const hasName = !!(session.user as any)?.name;
  const hasLastName = !!profileForm.lastName;
  const hasPhone = !!profileForm.phone;
  const hasBio = !!profileForm.bio;
  const hasZone = !!profileForm.zone;
  const hasAvatar = !!(session.user as any)?.image;
  const hasListing = (myListings?.length || 0) > 0;
  const isVerified = !!(session.user as any)?.verified;
  const profileCompletion = Math.min(
    100,
    (hasName ? 10 : 0) +
      (hasLastName ? 10 : 0) +
      (hasPhone ? 15 : 0) +
      (hasBio ? 20 : 0) +
      (hasZone ? 15 : 0) +
      (hasAvatar ? 10 : 0) +
      (hasListing ? 10 : 0) +
      (isVerified ? 10 : 0)
  );

  const stats = [
    { icon: LayoutList, label: "Publicaciones", value: totalListings },
    { icon: Star, label: "Calificación", value: avgRating > 0 ? avgRating.toFixed(1) : "—" },
    { icon: TrendingUp, label: "Ventas", value: "312" },
    { icon: Eye, label: "Vistas totales", value: totalViews },
  ];

  // Rating distribution dataset (driven by /api/me/stats)
  const ratingDistData: { name: string; value: number; fill: string }[] = myStats
    ? [
        { name: "5★", value: myStats.ratingDistribution?.["5"] || 0, fill: "var(--umpi-green)" },
        { name: "4★", value: myStats.ratingDistribution?.["4"] || 0, fill: "var(--umpi-accent)" },
        { name: "3★", value: myStats.ratingDistribution?.["3"] || 0, fill: "var(--umpi-gold)" },
        { name: "2★", value: myStats.ratingDistribution?.["2"] || 0, fill: "var(--umpi-purple)" },
        { name: "1★", value: myStats.ratingDistribution?.["1"] || 0, fill: "#dc2626" },
      ]
    : [];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Profile card */}
      <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="w-20 h-20 border-4 border-[var(--umpi-accent)]/20 shrink-0">
            <AvatarFallback
              className="text-2xl font-semibold bg-[var(--umpi-accent)] text-white"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              {session.user.name?.[0]?.toUpperCase() || "U"}
              {(session.user as any)?.name?.split(" ")[1]?.[0]?.toUpperCase() || ""}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-display text-2xl text-[var(--umpi-text)]">{session.user.name}</h1>
              {(session.user as any)?.verified && (
                <Badge className="bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-0 gap-1 rounded-full px-2 py-0.5">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verificado
                </Badge>
              )}
              {headerPlanBadge && (
                <Badge
                  className="border-0 gap-1 rounded-full px-2 py-0.5"
                  style={{ background: headerPlanBadge.bg, color: headerPlanBadge.color }}
                >
                  <Crown className="w-3.5 h-3.5" />
                  {headerPlanBadge.label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[var(--umpi-text2)] mb-2 break-all">{session.user.email}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--umpi-text2)]">
                Miembro desde {formatDate((session.user as any)?.createdAt || new Date())}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
              className="border-[var(--umpi-border)] border hover:bg-[var(--umpi-surface2)] hover:border-[var(--umpi-accent)] hover:text-[var(--umpi-accent)] gap-2"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
            {userPlan === "basico" && (
              <Button
                onClick={() => onNavigate("suscripciones")}
                className="bg-[var(--umpi-purple)] hover:bg-[var(--umpi-purple)]/90 text-white gap-2"
              >
                <Crown className="w-4 h-4" />
                Mejorar plan
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-[var(--umpi-surface2)] rounded-lg p-3 text-center">
              <s.icon className="w-4 h-4 mx-auto mb-1 text-[var(--umpi-accent)]" />
              <p className="font-display text-xl text-[var(--umpi-text)]">{s.value}</p>
              <p className="text-xs text-[var(--umpi-text2)]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-4">
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Estadísticas</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5">
            <LayoutList className="w-4 h-4" />
            <span className="hidden sm:inline">Mis publicaciones</span>
            <span className="sm:hidden">Avisos</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Favoritos</span>
            <span className="sm:hidden">Favs</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Suscripción</span>
            <span className="sm:hidden">Plan</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configuración</span>
            <span className="sm:hidden">Ajustes</span>
          </TabsTrigger>
        </TabsList>

        {/* Stats dashboard */}
        <TabsContent value="stats">
          {myStatsLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-[var(--umpi-surface2)] animate-pulse"
                  />
                ))}
              </div>
              <div className="h-[280px] rounded-xl bg-[var(--umpi-surface2)] animate-pulse" />
              <div className="h-[260px] rounded-xl bg-[var(--umpi-surface2)] animate-pulse" />
            </div>
          ) : !myStats ? (
            <div className="text-center py-12 text-[var(--umpi-text2)]">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-[var(--umpi-text3)]" />
              <p>No hay estadísticas disponibles</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile completion */}
              <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-[var(--umpi-text)]">Completá tu perfil</h3>
                    <p className="text-xs text-[var(--umpi-text2)] mt-0.5">
                      Un perfil completo genera más confianza y visibilidad
                    </p>
                  </div>
                  {profileCompletion === 100 ? (
                    <Badge className="bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-0 gap-1 rounded-full px-3 py-1 shrink-0">
                      <BadgeCheck className="w-4 h-4" />
                      Perfil completo ✓
                    </Badge>
                  ) : (
                    <span className="font-display text-lg text-[var(--umpi-accent)] shrink-0">
                      {profileCompletion}%
                    </span>
                  )}
                </div>
                <Progress value={profileCompletion} className="h-2 bg-[var(--umpi-surface2)]" />
                {profileCompletion < 100 && (
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="outline"
                      onClick={() => setEditDialogOpen(true)}
                      className="border-[var(--umpi-accent)] text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent)] hover:text-white gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Completar perfil
                    </Button>
                  </div>
                )}
              </div>

              {/* Overview cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--umpi-accent-soft)] grid place-items-center shrink-0">
                    <FileText className="w-5 h-5 text-[var(--umpi-accent)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xl text-[var(--umpi-text)]">
                      {myStats.overview.totalListings}
                    </p>
                    <p className="text-xs text-[var(--umpi-text2)] truncate">Publicaciones</p>
                  </div>
                </div>
                <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--umpi-green-soft)] grid place-items-center shrink-0">
                    <Eye className="w-5 h-5 text-[var(--umpi-green)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xl text-[var(--umpi-text)]">
                      {formatViews(myStats.overview.totalViews)}
                    </p>
                    <p className="text-xs text-[var(--umpi-text2)] truncate">Vistas totales</p>
                  </div>
                </div>
                <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--umpi-gold-soft)] grid place-items-center shrink-0">
                    <Star className="w-5 h-5 text-[var(--umpi-gold)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xl text-[var(--umpi-text)]">
                      {myStats.overview.avgRating > 0
                        ? myStats.overview.avgRating.toFixed(1)
                        : "—"}
                    </p>
                    <p className="text-xs text-[var(--umpi-text2)] truncate">Calificación prom.</p>
                  </div>
                </div>
                <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--umpi-purple-soft)] grid place-items-center shrink-0">
                    <Heart className="w-5 h-5 text-[var(--umpi-purple)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xl text-[var(--umpi-text)]">
                      {myStats.overview.totalFavorites}
                    </p>
                    <p className="text-xs text-[var(--umpi-text2)] truncate">Favoritos recibidos</p>
                  </div>
                </div>
              </div>

              {/* Quick action buttons */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate("publicar")}
                  className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4 hover:border-[var(--umpi-accent)] hover:shadow-md transition-all flex flex-col items-center gap-2 text-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--umpi-accent-soft)] grid place-items-center">
                    <Plus className="w-5 h-5 text-[var(--umpi-accent)]" />
                  </div>
                  <span className="text-sm font-medium text-[var(--umpi-text)]">Publicar nuevo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("favorites")}
                  className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4 hover:border-[var(--umpi-accent)] hover:shadow-md transition-all flex flex-col items-center gap-2 text-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--umpi-gold-soft)] grid place-items-center">
                    <Heart className="w-5 h-5 text-[var(--umpi-gold)]" />
                  </div>
                  <span className="text-sm font-medium text-[var(--umpi-text)]">Ver mis favoritos</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("mensajes")}
                  className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4 hover:border-[var(--umpi-accent)] hover:shadow-md transition-all flex flex-col items-center gap-2 text-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--umpi-purple-soft)] grid place-items-center">
                    <MessageSquare className="w-5 h-5 text-[var(--umpi-purple)]" />
                  </div>
                  <span className="text-sm font-medium text-[var(--umpi-text)]">Ver mis mensajes</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("suscripciones")}
                  className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4 hover:border-[var(--umpi-accent)] hover:shadow-md transition-all flex flex-col items-center gap-2 text-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--umpi-gold-soft)] grid place-items-center">
                    <Crown className="w-5 h-5 text-[var(--umpi-gold)]" />
                  </div>
                  <span className="text-sm font-medium text-[var(--umpi-text)]">Mejorar plan</span>
                </button>
              </div>

              {/* Charts row: AreaChart + Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 p-6 bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[var(--umpi-text)]">
                        Vistas últimos 6 meses
                      </h3>
                      <p className="text-xs text-[var(--umpi-text2)] mt-0.5">
                        Total acumulado: {formatViews(myStats.overview.totalViews)}
                      </p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-[var(--umpi-accent)]" />
                  </div>
                  <ChartContainer
                    config={statsAreaChartConfig}
                    className="!aspect-auto h-[240px] w-full"
                  >
                    <AreaChart
                      data={myStats.viewsOverTime}
                      margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--umpi-accent)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--umpi-accent)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--umpi-border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "var(--umpi-text2)" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--umpi-text3)" }}
                        width={40}
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="var(--umpi-accent)"
                        strokeWidth={2.5}
                        fill="url(#viewsGradient)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </Card>

                {/* Rating distribution donut */}
                <Card className="p-6 bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                  <h3 className="font-semibold text-[var(--umpi-text)] mb-4">
                    Distribución de calificaciones
                  </h3>
                  <div className="relative">
                    <ChartContainer
                      config={ratingDistChartConfig}
                      className="!aspect-auto h-[200px] w-full mx-auto"
                    >
                      <PieChart>
                        <Pie
                          data={ratingDistData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          strokeWidth={2}
                          stroke="var(--umpi-surface)"
                        >
                          {ratingDistData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent nameKey="name" />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="font-display text-2xl text-[var(--umpi-text)]">
                        {myStats.overview.totalReviews}
                      </div>
                      <div className="text-xs text-[var(--umpi-text2)]">reseñas</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 text-xs">
                    {ratingDistData.map((r) => (
                      <div key={r.name} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-[2px]"
                          style={{ backgroundColor: r.fill }}
                        />
                        <span className="text-[var(--umpi-text2)]">{r.name}</span>
                        <span className="text-[var(--umpi-text3)]">({r.value})</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Top listings bar chart */}
              <Card className="p-6 bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--umpi-text)]">
                      Tus publicaciones más vistas
                    </h3>
                    <p className="text-xs text-[var(--umpi-text2)] mt-0.5">
                      Top 5 por cantidad de vistas
                    </p>
                  </div>
                  <LayoutList className="w-5 h-5 text-[var(--umpi-accent)]" />
                </div>
                {!myStats.topListings || myStats.topListings.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[var(--umpi-text3)]">
                    Aún no tenés publicaciones con vistas
                  </div>
                ) : (
                  <ChartContainer
                    config={topListingsChartConfig}
                    className="!aspect-auto h-[260px] w-full"
                  >
                    <BarChart
                      data={myStats.topListings}
                      margin={{ top: 10, right: 10, bottom: 30, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--umpi-border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="title"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--umpi-text2)" }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--umpi-text3)" }}
                        width={40}
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="views"
                        fill="var(--umpi-accent)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={64}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </Card>

              {/* Achievements - horizontal scrollable row */}
              <Card className="p-6 bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[var(--umpi-text)]">Logros</h3>
                  <span className="text-xs text-[var(--umpi-text3)]">
                    {myStats.achievements?.filter((a: any) => a.earned).length || 0} /{" "}
                    {myStats.achievements?.length || 0} desbloqueados
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {(myStats.achievements || []).map((a: any) => {
                    const Icon = achievementIconMap[a.icon] || Trophy;
                    return (
                      <div
                        key={a.id}
                        className={`relative shrink-0 w-32 rounded-xl border p-3 text-center transition ${
                          a.earned
                            ? "bg-[var(--umpi-surface2)] border-[var(--umpi-border)]"
                            : "bg-[var(--umpi-surface2)]/50 border-[var(--umpi-border)] opacity-60"
                        }`}
                        title={a.description}
                      >
                        <div
                          className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                            a.earned
                              ? "bg-[var(--umpi-accent-soft)]"
                              : "bg-[var(--umpi-surface2)]"
                          }`}
                        >
                          {a.earned ? (
                            <Icon className="w-5 h-5 text-[var(--umpi-accent)]" />
                          ) : (
                            <Lock className="w-4 h-4 text-[var(--umpi-text3)]" />
                          )}
                        </div>
                        <p className="text-xs font-medium text-[var(--umpi-text)] leading-tight line-clamp-2">
                          {a.title}
                        </p>
                        {!a.earned && (
                          <p className="text-[10px] text-[var(--umpi-text3)] mt-1 line-clamp-2">
                            {a.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Activity timeline */}
              <Card className="p-6 bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                <h3 className="font-semibold text-[var(--umpi-text)] mb-4">
                  Actividad reciente
                </h3>
                {!myStats.recentActivity || myStats.recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[var(--umpi-text3)]">
                    Aún no registrás actividad
                  </div>
                ) : (
                  <ol className="relative border-l-2 border-[var(--umpi-border)] ml-3 space-y-4">
                    {myStats.recentActivity.map((act: any, i: number) => {
                      const Icon = activityIconMap[act.type] || FileText;
                      const iconColor = activityIconColor[act.type] || "var(--umpi-accent)";
                      return (
                        <li key={i} className="ml-6">
                          <span
                            className="absolute -left-[14px] flex items-center justify-center w-7 h-7 rounded-full ring-4 ring-[var(--umpi-surface)]"
                            style={{ backgroundColor: `${iconColor}1a` }}
                          >
                            <Icon
                              className="w-3.5 h-3.5"
                              style={{ color: iconColor }}
                            />
                          </span>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                            <p className="text-sm text-[var(--umpi-text)] leading-snug">
                              {act.description}
                            </p>
                            <time className="text-xs text-[var(--umpi-text3)] shrink-0">
                              {timeAgo(act.timestamp)}
                            </time>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Card>

              {/* Listing Performance - Horizontal Bar Chart */}
              <Card className="p-6 bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--umpi-text)]">
                      Rendimiento de publicaciones
                    </h3>
                    <p className="text-xs text-[var(--umpi-text2)] mt-0.5">
                      Top 5 publicaciones por vistas
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-[var(--umpi-accent)]" />
                </div>
                {!myListings || myListings.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[var(--umpi-text3)]">
                    Aún no tenés publicaciones para medir rendimiento
                  </div>
                ) : listingPerformanceData.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[var(--umpi-text3)]">
                    Aún no tenés vistas en tus publicaciones
                  </div>
                ) : (
                  <>
                    <ChartContainer
                      config={listingPerformanceConfig}
                      className="!aspect-auto h-[260px] w-full"
                    >
                      <BarChart
                        layout="vertical"
                        data={listingPerformanceData}
                        margin={{ top: 10, right: 30, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--umpi-border)"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "var(--umpi-text3)" }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="title"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "var(--umpi-text2)" }}
                          width={130}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="views"
                          fill="var(--umpi-accent)"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ChartContainer>

                    {/* Summary grid */}
                    <div className="grid grid-cols-3 gap-3 mt-5">
                      <div className="bg-[var(--umpi-surface2)] rounded-lg p-3 text-center">
                        <Eye className="w-4 h-4 mx-auto mb-1 text-[var(--umpi-accent)]" />
                        <p className="font-display text-lg text-[var(--umpi-text)]">
                          {formatViews(listingPerformanceSummary.totalViews)}
                        </p>
                        <p className="text-[10px] text-[var(--umpi-text2)]">Vistas totales</p>
                      </div>
                      <div className="bg-[var(--umpi-surface2)] rounded-lg p-3 text-center">
                        <BarChart3 className="w-4 h-4 mx-auto mb-1 text-[var(--umpi-accent)]" />
                        <p className="font-display text-lg text-[var(--umpi-text)]">
                          {formatViews(listingPerformanceSummary.avgViews)}
                        </p>
                        <p className="text-[10px] text-[var(--umpi-text2)]">Promedio por publicación</p>
                      </div>
                      <div className="bg-[var(--umpi-surface2)] rounded-lg p-3 text-center">
                        <Trophy className="w-4 h-4 mx-auto mb-1 text-[var(--umpi-gold)]" />
                        <p className="font-display text-sm text-[var(--umpi-text)] line-clamp-1">
                          {listingPerformanceSummary.bestListing
                            ? listingPerformanceSummary.bestListing.title.length > 20
                              ? listingPerformanceSummary.bestListing.title.substring(0, 20) + "…"
                              : listingPerformanceSummary.bestListing.title
                            : "—"}
                        </p>
                        <p className="text-[10px] text-[var(--umpi-text2)]">Mejor publicación</p>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </TabsContent>

        {/* My listings */}
        <TabsContent value="listings">
          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4 text-center">
              <LayoutList className="w-4 h-4 mx-auto mb-1 text-[var(--umpi-accent)]" />
              <p className="font-display text-xl text-[var(--umpi-text)]">{totalListings}</p>
              <p className="text-xs text-[var(--umpi-text2)]">Publicaciones</p>
            </div>
            <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4 text-center">
              <Eye className="w-4 h-4 mx-auto mb-1 text-[var(--umpi-accent)]" />
              <p className="font-display text-xl text-[var(--umpi-text)]">{formatViews(totalViews)}</p>
              <p className="text-xs text-[var(--umpi-text2)]">Vistas totales</p>
            </div>
            <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4 text-center">
              <Star className="w-4 h-4 mx-auto mb-1 text-[var(--umpi-accent)]" />
              <p className="font-display text-xl text-[var(--umpi-text)]">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-[var(--umpi-text2)]">Calificación prom.</p>
            </div>
          </div>

          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Mis publicaciones ({myListings?.length || 0})</h2>
              <Button
                onClick={() => onNavigate("publicar")}
                className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva publicación
              </Button>
            </div>

            {listingsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : !myListings || myListings.length === 0 ? (
              <div className="text-center py-12">
                <LayoutList className="w-10 h-10 text-[var(--umpi-text3)] mx-auto mb-3" />
                <p className="text-[var(--umpi-text2)] mb-3">Todavía no tenés publicaciones</p>
                <Button onClick={() => onNavigate("publicar")} className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white">
                  Crear primera publicación
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.map((listing) => (
                  <div
                    key={listing.id}
                    className={`flex gap-3 p-3 border rounded-lg ${
                      listing.featured ? "border-[var(--umpi-gold)]" : "border-[var(--umpi-border)]"
                    }`}
                  >
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-[var(--umpi-surface2)] shrink-0">
                      <img
                        src={safeJsonParse<string[]>(listing.images, [])[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <button
                          onClick={() => onNavigate("detail", { id: listing.id, slug: listing.slug })}
                          className="font-medium text-sm hover:text-[var(--umpi-accent)] line-clamp-2 text-left"
                        >
                          {listing.title}
                        </button>
                        <Badge
                          className={
                            listing.status === "active"
                              ? "bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] text-[10px] shrink-0"
                              : listing.status === "paused"
                              ? "bg-[var(--umpi-gold-soft)] text-[var(--umpi-gold)] text-[10px] shrink-0"
                              : "bg-[var(--umpi-surface2)] text-[var(--umpi-text3)] text-[10px] shrink-0"
                          }
                        >
                          {listing.status === "active" ? "Activa" : listing.status === "paused" ? "Pausada" : "Pendiente"}
                        </Badge>
                      </div>
                      <p className="font-display text-lg text-[var(--umpi-text)] mb-1">
                        {formatPriceWithUnit(listing.price, listing.currency, listing.priceUnit || undefined)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--umpi-text3)] mb-2">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatViews(listing.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[var(--umpi-gold)] text-[var(--umpi-gold)]" />
                          {listing.rating.toFixed(1)} ({listing.reviewCount})
                        </span>
                        <span>{timeAgo(listing.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate("detail", { id: listing.id, slug: listing.slug })}
                          className="h-7 text-xs gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePauseListing.mutate({ id: listing.id, status: listing.status })}
                          className="h-7 text-xs gap-1"
                        >
                          {listing.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {listing.status === "active" ? "Pausar" : "Activar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate("publicar", { edit: listing.id })}
                          className="h-7 text-xs gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          Editar
                        </Button>
                        {listing.status === "active" && !listing.featured && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBoostType("destacado");
                              setBoostTarget({ id: listing.id, title: listing.title });
                            }}
                            className="h-7 text-xs gap-1 text-[var(--umpi-gold)] hover:text-[var(--umpi-gold)] hover:bg-[var(--umpi-gold-soft)] border-[var(--umpi-gold)]/30"
                          >
                            <Crown className="w-3 h-3" />
                            Destacar
                          </Button>
                        )}
                        {listing.featured && (
                          <Badge
                            className="text-[10px] gap-0.5 h-7"
                            style={{
                              background: "var(--umpi-gold-soft)",
                              color: "var(--umpi-gold)",
                            }}
                          >
                            <Crown className="w-3 h-3" />
                            Destacada
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTargetId(listing.id)}
                          className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Favorites */}
        <TabsContent value="favorites">
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
            <h2 className="font-semibold text-lg mb-4">
              Favoritos ({favorites?.length || 0})
            </h2>
            {!favorites || favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-10 h-10 text-[var(--umpi-text3)] mx-auto mb-3" />
                <p className="text-[var(--umpi-text2)] mb-3">No tenés favoritos guardados</p>
                <Button onClick={() => onNavigate("servicios")} variant="outline">
                  Explorar publicaciones
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map(({ listing }) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isFavorite
                    onClick={() => onNavigate("detail", { id: listing.id, slug: listing.slug })}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Subscription */}
        <TabsContent value="subscription">
          <div className="space-y-4">
            <div
              className="rounded-xl p-6 text-white relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #1a0f2e 0%, #2d1b4e 50%, #4c1d95 100%)" }}
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--umpi-purple)] opacity-20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-white/20 text-white border-0 gap-1">
                    <Crown className="w-3 h-3" />
                    Tu plan actual
                  </Badge>
                  {userPlan !== "basico" && (
                    <Badge className="bg-[var(--umpi-green)] text-white">
                      Activo
                    </Badge>
                  )}
                </div>
                <h2 className="font-display text-3xl mb-1 capitalize">{planBadge.label}</h2>
                <p className="text-white/70 text-sm mb-4">
                  {userPlan === "basico"
                    ? "Estás usando el plan gratuito. Mejorá a Pro para desbloquear todas las funciones."
                    : "¡Sos parte de UMPI Premium! Disfrutá de todos los beneficios."}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                    <p className="text-xs text-white/60 mb-0.5">Publicaciones</p>
                    <p className="font-semibold">
                      {myListings?.length || 0} / {userPlan === "basico" ? "1" : userPlan === "pro" ? "5" : "∞"}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                    <p className="text-xs text-white/60 mb-0.5">Destacados</p>
                    <p className="font-semibold">
                      {myListings?.filter((l) => l.featured).length || 0} / {userPlan === "basico" ? "0" : userPlan === "pro" ? "2" : "10"}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                    <p className="text-xs text-white/60 mb-0.5">Top 10</p>
                    <p className="font-semibold">{userPlan === "basico" ? "❌" : "✓ Acceso"}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                    <p className="text-xs text-white/60 mb-0.5">Verificado</p>
                    <p className="font-semibold">{userPlan === "basico" ? "❌" : "✓ Badge"}</p>
                  </div>
                </div>
                {userPlan === "basico" ? (
                  <Button
                    onClick={() => onNavigate("suscripciones")}
                    className="mt-4 bg-white text-[var(--umpi-purple)] hover:bg-white/90 font-semibold gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Mejorar a Premium
                  </Button>
                ) : (
                  <Button
                    onClick={() => toast.info("Gestioná tu suscripción desde Mercado Pago")}
                    variant="outline"
                    className="mt-4 bg-transparent border-white/30 text-white hover:bg-white/10"
                  >
                    Gestionar suscripción
                  </Button>
                )}
              </div>
            </div>

            {/* Recent transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historial de pagos</CardTitle>
              </CardHeader>
              <CardContent>
                {subscription?.transactions?.length === 0 ? (
                  <p className="text-sm text-[var(--umpi-text3)] text-center py-4">
                    No tenés transacciones todavía
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subscription?.transactions?.slice(0, 5).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 border border-[var(--umpi-border)] rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{tx.concept}</p>
                          <p className="text-xs text-[var(--umpi-text3)]">{formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">${tx.amount.toLocaleString("es-AR")}</p>
                          <Badge className={
                            tx.status === "approved" ? "bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] text-[10px]"
                            : tx.status === "pending" ? "bg-[var(--umpi-gold-soft)] text-[var(--umpi-gold)] text-[10px]"
                            : "bg-[var(--umpi-surface2)] text-[var(--umpi-text3)] text-[10px]"
                          }>
                            {tx.status === "approved" ? "Aprobado" : tx.status === "pending" ? "Pendiente" : tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <div className="space-y-4">
            {/* Account info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--umpi-accent)]" />
                  Datos de la cuenta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--umpi-text3)] mb-0.5">Nombre</p>
                    <p className="font-medium text-[var(--umpi-text)]">
                      {[profileForm.name, profileForm.lastName].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--umpi-text3)] mb-0.5">Email</p>
                    <p className="font-medium text-[var(--umpi-text)] break-all">
                      {session.user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--umpi-text3)] mb-0.5">Teléfono</p>
                    <p className="font-medium text-[var(--umpi-text)]">
                      {profileForm.phone || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--umpi-text3)] mb-0.5">Zona</p>
                    <p className="font-medium text-[var(--umpi-text)]">
                      {profileForm.zone || "—"}
                    </p>
                  </div>
                </div>
                {profileForm.bio && (
                  <div>
                    <p className="text-xs text-[var(--umpi-text3)] mb-0.5">Biografía</p>
                    <p className="text-sm text-[var(--umpi-text2)] leading-relaxed">
                      {profileForm.bio}
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                  className="border-[var(--umpi-border)] hover:bg-[var(--umpi-surface2)] gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar perfil
                </Button>
              </CardContent>
            </Card>

            {/* Change password */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[var(--umpi-accent)]" />
                  Cambiar contraseña
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                      toast.error("Las contraseñas no coinciden");
                      return;
                    }
                    if (passwordForm.newPassword.length < 6) {
                      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
                      return;
                    }
                    changePassword.mutate({
                      currentPassword: passwordForm.currentPassword,
                      newPassword: passwordForm.newPassword,
                    });
                  }}
                  className="space-y-4 max-w-lg"
                >
                  <div>
                    <Label htmlFor="currentPassword" className="text-xs">
                      Contraseña actual
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      placeholder="••••••••"
                      className="h-10"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword" className="text-xs">
                      Nueva contraseña
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="h-10"
                      required
                      autoComplete="new-password"
                    />
                    {passwordForm.newPassword.length > 0 &&
                      passwordForm.newPassword.length < 6 && (
                        <p className="text-xs text-red-600 mt-1">
                          Debe tener al menos 6 caracteres
                        </p>
                      )}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-xs">
                      Confirmar nueva contraseña
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      placeholder="Repetí la nueva contraseña"
                      className="h-10"
                      required
                      autoComplete="new-password"
                    />
                    {passwordForm.confirmPassword.length > 0 &&
                      passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <p className="text-xs text-red-600 mt-1">
                          Las contraseñas no coinciden
                        </p>
                      )}
                  </div>
                  <Button
                    type="submit"
                    disabled={changePassword.isPending}
                    className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {changePassword.isPending ? "Actualizando…" : "Actualizar contraseña"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar perfil</DialogTitle>
            <DialogDescription>
              Actualizá tus datos personales. Los cambios se guardan al hacer clic en Guardar.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile.mutate(profileForm);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-name" className="text-xs">
                  Nombre
                </Label>
                <Input
                  id="edit-name"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  className="h-10"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName" className="text-xs">
                  Apellido
                </Label>
                <Input
                  id="edit-lastName"
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lastName: e.target.value })
                  }
                  className="h-10"
                  placeholder="Tu apellido"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-phone" className="text-xs">
                Teléfono
              </Label>
              <Input
                id="edit-phone"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone: e.target.value })
                }
                placeholder="+54 11 1234-5678"
                className="h-10"
              />
            </div>
            <div>
              <Label htmlFor="edit-zone" className="text-xs">
                Zona / Ubicación
              </Label>
              <Input
                id="edit-zone"
                value={profileForm.zone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, zone: e.target.value })
                }
                placeholder="CABA — Palermo"
                className="h-10"
              />
            </div>
            <div>
              <Label htmlFor="edit-bio" className="text-xs">
                Biografía
              </Label>
              <Textarea
                id="edit-bio"
                value={profileForm.bio}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, bio: e.target.value })
                }
                placeholder="Contá sobre vos y tus servicios…"
                className="min-h-[90px]"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updateProfile.isPending}
                className="border-[var(--umpi-border)]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateProfile.isPending}
                className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white gap-2"
              >
                <Save className="w-4 h-4" />
                {updateProfile.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Listing AlertDialog */}
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La publicación se eliminará permanentemente
              de tu cuenta y ya no será visible para otros usuarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteListing.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTargetId) deleteListing.mutate(deleteTargetId);
              }}
              disabled={deleteListing.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteListing.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Boost Listing Dialog ─── */}
      <Dialog
        open={boostTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBoostTarget(null);
            setBoostType("destacado");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[var(--umpi-gold)]" />
              Destacar publicación
            </DialogTitle>
            <DialogDescription>
              Elegí el tipo de impulso para{" "}
              <strong className="text-[var(--umpi-text)]">
                {boostTarget?.title}
              </strong>
              . El pago se procesa por MercadoPago y el destacado se activa al confirmarse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2">
            {BOOST_OPTIONS.map((opt) => {
              const selected = boostType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBoostType(opt.value)}
                  className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                    selected
                      ? "border-[var(--umpi-gold)] bg-[var(--umpi-gold-soft)]"
                      : "border-[var(--umpi-border)] bg-[var(--umpi-surface)] hover:border-[var(--umpi-text3)]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-8 h-8 rounded-md grid place-items-center shrink-0"
                      style={{
                        background: selected ? "var(--umpi-gold)" : "var(--umpi-surface2)",
                        color: selected ? "white" : "var(--umpi-gold)",
                      }}
                    >
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-[var(--umpi-text)]">
                          {opt.title}
                        </span>
                        <span className="font-display text-base text-[var(--umpi-text)]">
                          ${opt.price.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--umpi-text2)] mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-[var(--umpi-surface2)] rounded-lg p-3 text-xs text-[var(--umpi-text2)] flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--umpi-gold)]" />
            <span>
              Al confirmar, vas a ser redirigido a MercadoPago. El destacado se activa
              automáticamente cuando se aprueba el pago.
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBoostTarget(null);
                setBoostType("destacado");
              }}
              disabled={boostListing.isPending}
              className="border-[var(--umpi-border)]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (boostTarget) {
                  boostListing.mutate({ listingId: boostTarget.id, boostType });
                }
              }}
              disabled={boostListing.isPending}
              className="gap-2"
              style={{ background: "var(--umpi-gold)", color: "white" }}
            >
              {boostListing.isPending ? (
                <>
                  <span className="w-4 h-4 mr-1 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  Pagar ${BOOST_OPTIONS.find((o) => o.value === boostType)?.price.toLocaleString("es-AR")} con MercadoPago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
