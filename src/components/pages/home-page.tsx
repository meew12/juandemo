"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  TrendingUp,
  Users,
  Star,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Car,
  Home as HomeIcon,
  Wrench,
  ChevronRight,
  Quote,
  CreditCard,
  Truck,
  Building,
  Landmark,
  MessageCircle,
  Flame,
  BadgeCheck,
  Crown,
  Headphones,
  MessageSquare,
  HandCoins,
} from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ListingCard } from "@/components/listing-card";
import { ListingCardSkeleton } from "@/components/skeletons";
import { AnimatedCounter } from "@/components/animated-counter";
import { RecentlyViewedSection } from "@/components/recently-viewed";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteConfig } from "@/hooks/use-site-config";
import type { Listing } from "@/lib/types";

/**
 * Convierte un string como "48.500+" o "32.000" en un número (48000 / 32000).
 * Si el string no contiene dígitos, devuelve el fallback.
 */
function parseCount(str: string, fallback: number): number {
  const n = parseInt(str.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Convierte un string como "4.8/5" en un número (4.8).
 * Si el string no contiene dígitos, devuelve el fallback.
 */
function parseFloatValue(str: string, fallback: number): number {
  const match = str.match(/\d+(?:[.,]\d+)?/);
  if (!match) return fallback;
  const n = parseFloat(match[0].replace(",", "."));
  return isNaN(n) ? fallback : n;
}

async function fetchFeatured() {
  const res = await fetch("/api/listings?featured=true&limit=8");
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.listings as Listing[];
}

interface Testimonial {
  id: string;
  name: string;
  initials: string;
  rating: number;
  text: string;
  role: string;
}

async function fetchTestimonials(): Promise<Testimonial[]> {
  const res = await fetch("/api/testimonials");
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return (data.testimonials || []).map((t: any) => ({
    id: t.id,
    name: t.userName,
    initials: t.userInitials,
    rating: t.rating,
    text: t.comment,
    role: t.listingTitle,
  }));
}

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: "fb-1",
    name: "Martín López",
    role: "Plomero en CABA",
    initials: "ML",
    rating: 5,
    text: "UMPI me cambió la vida. Antes conseguía clientes por boca a boca, ahora tengo pedidos todos los días. La plataforma es súper fácil de usar y el soporte siempre responde rápido.",
  },
  {
    id: "fb-2",
    name: "Valentina Gómez",
    role: "Vendedora verificada",
    initials: "VG",
    rating: 5,
    text: "Vendí mi auto en menos de una semana. La publicación fue rápida y los compradores eran serios. Lo recomiendo al 100% para cualquiera que quiera vender algo en Argentina.",
  },
  {
    id: "fb-3",
    name: "Diego Fernández",
    role: "Electricista en Rosario",
    initials: "DF",
    rating: 4,
    text: "Muy buena plataforma. Empecé con el plan gratis y ya me dio resultado. Ahora estoy en Premium y la diferencia es notable, mucho más visibilidad para mis servicios.",
  },
];

export function HomePage({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) {
  const [search, setSearch] = useState("");
  const { get } = useSiteConfig();

  const { data: featured, isLoading } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: fetchFeatured,
  });

  const { data: testimonials, isLoading: testimonialsLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: fetchTestimonials,
  });

  const displayTestimonials = testimonials?.length ? testimonials : FALLBACK_TESTIMONIALS;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      onNavigate("servicios", { q: search.trim() });
    } else {
      onNavigate("servicios");
    }
  };

  // Traemos los textos/valores de la DB vía CMS (admin → SiteConfig).
  // Si la config todavía no cargó o no hay valor, usamos el fallback hardcodeado.
  const stats = [
    { icon: TrendingUp, label: get("trust.publicationsLabel", "Publicaciones"), value: parseCount(get("trust.publications", "48000+"), 48000), suffix: "+", color: "var(--umpi-accent)" },
    { icon: Users, label: get("trust.usersLabel", "Vendedores"), value: parseCount(get("trust.users", "12000+"), 12000), suffix: "+", color: "var(--umpi-blue)" },
    { icon: Star, label: get("trust.ratingLabel", "Satisfacción"), value: parseFloatValue(get("trust.rating", "4.8"), 4.8), suffix: "★", color: "var(--umpi-gold)", decimals: 1 },
    { icon: ShieldCheck, label: "Compras seguras", value: 98, suffix: "%", color: "var(--umpi-green)" },
  ];

  // Hero title: si tiene coma, parte en dos líneas (segunda línea en <em>).
  const heroTitle = get("hero.title", "Encontrá lo que buscás, publicá lo que ofrecés");
  const heroCommaIdx = heroTitle.indexOf(",");
  const heroTitleBefore = heroCommaIdx >= 0 ? heroTitle.slice(0, heroCommaIdx + 1) : heroTitle;
  const heroTitleAfter = heroCommaIdx >= 0 ? heroTitle.slice(heroCommaIdx + 1).trim() : "";

  const categoryCards = [
    {
      title: "Servicios profesionales",
      desc: "Encontrá el profesional ideal para cualquier necesidad",
      count: "1.259 resultados",
      img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80",
      page: "servicios",
      icon: Wrench,
      badge: "Popular",
    },
    {
      title: "Autos y vehículos",
      desc: "Comprá, vendé o alquilá tu próximo vehículo",
      count: "8.940 vehículos",
      img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
      page: "autos",
      icon: Car,
      badge: null,
    },
    {
      title: "Propiedades",
      desc: "Inmuebles en venta y alquiler en toda Argentina",
      count: "6.100 inmuebles",
      img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
      page: "propiedades",
      icon: HomeIcon,
      badge: "Nuevo",
    },
  ];

  const categoryIcons = [
    { label: "Servicios", icon: Wrench, page: "servicios", color: "var(--umpi-accent)", bg: "var(--umpi-accent-soft)" },
    { label: "Autos", icon: Car, page: "autos", color: "var(--umpi-gold)", bg: "var(--umpi-gold-soft)" },
    { label: "Propiedades", icon: HomeIcon, page: "propiedades", color: "var(--umpi-green)", bg: "var(--umpi-green-soft)" },
    { label: "Destacados", icon: Star, page: "servicios", color: "var(--umpi-purple)", bg: "var(--umpi-purple-soft)" },
    { label: "Verificados", icon: BadgeCheck, page: "servicios", color: "var(--umpi-green)", bg: "var(--umpi-green-soft)" },
    { label: "Premium", icon: Crown, page: "suscripciones", color: "var(--umpi-gold)", bg: "var(--umpi-gold-soft)" },
  ];

  const isNewListing = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return now - created < 24 * 60 * 60 * 1000;
  };

  return (
    <div className="animate-fade-in">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden text-white hero-gradient">
        <div className="absolute inset-0 hero-glow" />

        {/* Floating decorative blobs */}
        <div className="absolute top-12 left-[10%] w-20 h-20 rounded-full bg-[var(--umpi-accent)] opacity-10 blur-2xl animate-float" />
        <div className="absolute top-32 right-[15%] w-32 h-32 rounded-full bg-[var(--umpi-purple)] opacity-10 blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 left-[20%] w-24 h-24 rounded-full bg-[var(--umpi-gold)] opacity-10 blur-2xl animate-float-delay-1" />
        <div className="absolute bottom-10 right-[25%] w-16 h-16 rounded-full bg-[var(--umpi-accent2)] opacity-10 blur-xl animate-float-delay-2" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center">
            {/* Popular ahora badge */}
            <Badge
              className="mb-4 px-3 py-1.5 bg-[var(--umpi-accent)] text-white border-0 gap-1.5 animate-slide-up"
            >
              <Flame className="w-3.5 h-3.5" />
              Popular ahora
            </Badge>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-4">
              {heroTitleBefore}
              {heroTitleAfter && (
                <>
                  <br />
                  <em className="text-[var(--umpi-accent2)]">{heroTitleAfter}</em>
                </>
              )}
            </h1>
            <p className="text-lg text-white/90 font-medium mb-8 max-w-2xl mx-auto">
              {get(
                "hero.subtitle",
                "Servicios profesionales, autos y propiedades en un solo lugar. Conectá con miles de vendedores verificados en toda Argentina."
              )}
            </p>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--umpi-text2)] z-10" />
              <Input
                type="text"
                placeholder={get("hero.searchPlaceholder", "Buscar servicios, autos, propiedades…")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-32 h-14 bg-white text-[var(--umpi-text)] border-0 rounded-full shadow-lg text-base placeholder:text-[var(--umpi-text2)] placeholder:font-medium focus-visible:ring-2 focus-visible:ring-[var(--umpi-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-shadow"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white h-10 px-6 rounded-full font-semibold"
              >
                Buscar
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <span className="text-sm text-white/80 font-medium">Sugerencias:</span>
              {["Plomero", "Toyota Corolla", "Departamento Palermo", "Diseño web"].map((s) => (
                <button
                  key={s}
                  onClick={() => onNavigate("servicios", { q: s })}
                  className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white/95 text-xs font-medium border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors"
              >
                <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
                <AnimatedCounter
                  value={s.value}
                  suffix={s.suffix}
                  decimals={(s as any).decimals || 0}
                  className="font-display text-2xl font-semibold text-white"
                />
                <div className="text-xs text-white/80">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── POPULAR SEARCHES ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <span className="text-xs font-semibold text-[var(--umpi-text3)] uppercase tracking-wider">Búsquedas populares</span>
          {[
            { label: "Plomero", page: "servicios" },
            { label: "Electricista", page: "servicios" },
            { label: "Toyota Corolla", page: "autos" },
            { label: "Departamento Palermo", page: "propiedades" },
            { label: "Diseño web", page: "servicios" },
            { label: "Casa en Córdoba", page: "propiedades" },
            { label: "Profesor de guitarra", page: "servicios" },
            { label: "Hilux", page: "autos" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => onNavigate(s.page, { q: s.label })}
              className="px-3 py-1.5 rounded-full bg-[var(--umpi-surface)] border border-[var(--umpi-border)] text-xs font-medium text-[var(--umpi-text)] hover:text-[var(--umpi-accent)] hover:border-[var(--umpi-accent)]/30 hover:bg-[var(--umpi-accent-soft)] transition-all duration-200"
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── CATEGORY ICON CARDS ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl sm:text-3xl mb-1">Explorá por categoría</h2>
          <p className="text-sm text-[var(--umpi-text2)]">
            Encontrá lo que necesitás en segundos
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categoryIcons.map((cat) => (
            <button
              key={cat.label}
              onClick={() => onNavigate(cat.page)}
              className="group flex flex-col items-center gap-3 bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-5 hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-[var(--umpi-accent)]/20 transition-all duration-200"
            >
              <div
                className="w-14 h-14 rounded-xl grid place-items-center transition-transform group-hover:scale-110"
                style={{ background: cat.bg }}
              >
                <cat.icon className="w-8 h-8" style={{ color: cat.color }} />
              </div>
              <span className="text-sm font-semibold text-[var(--umpi-text)] group-hover:text-[var(--umpi-accent)] transition-colors">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl mb-1">Categorías destacadas</h2>
            <p className="text-sm text-[var(--umpi-text2)]">
              Miles de opciones en cada rubro, con vendedores verificados
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categoryCards.map((cat) => (
            <button
              key={cat.title}
              onClick={() => onNavigate(cat.page)}
              className="group relative overflow-hidden rounded-2xl bg-[var(--umpi-surface)] border border-[var(--umpi-border)] text-left transition-all hover:shadow-[0_8px_32px_rgba(26,22,18,0.12)] hover:-translate-y-1"
            >
              <div className="aspect-[16/10] relative overflow-hidden bg-[var(--umpi-surface2)]">
                <img
                  src={cat.img}
                  alt={cat.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {cat.badge && (
                  <Badge
                    className="absolute top-3 right-3 bg-[var(--umpi-accent)] text-white text-[10px]"
                  >
                    {cat.badge}
                  </Badge>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <cat.icon className="w-5 h-5" />
                    <h3 className="font-semibold text-lg">{cat.title}</h3>
                  </div>
                  <p className="text-sm text-white/80">{cat.desc}</p>
                  <p className="text-xs text-white/60 mt-1">{cat.count}</p>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--umpi-accent)]">Explorar</span>
                <ArrowRight className="w-4 h-4 text-[var(--umpi-accent)] group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ─── RECENTLY VIEWED ─── */}
      <RecentlyViewedSection onNavigate={onNavigate} />

      {/* ─── HOW IT WORKS (Task 6) ─── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="w-10 h-1 bg-[var(--umpi-accent)] rounded-full mx-auto mb-4" />
          <h2 className="font-display text-2xl sm:text-3xl mb-2">¿Cómo funciona UMPI?</h2>
          <p className="text-sm text-[var(--umpi-text2)] max-w-lg mx-auto">
            Conectá con vendedores en 3 pasos simples
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Connecting dashed line - desktop only */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-px border-t-2 border-dashed border-[var(--umpi-border)]" />

          {[
            {
              num: "1",
              title: "Buscá",
              desc: "Explorá miles de servicios, autos y propiedades. Filtrá por zona, precio y categoría hasta encontrar lo que necesitás.",
              icon: Search,
            },
            {
              num: "2",
              title: "Conectá",
              desc: "Escribile al vendedor por chat o WhatsApp. Coordiná detalles, preguntá lo que necesites y acordá el encuentro.",
              icon: MessageSquare,
            },
            {
              num: "3",
              title: "Concretá",
              desc: "Pagá con MercadoPago y reviews al vendedor. Dejá tu reseña para ayudar a otros usuarios.",
              icon: HandCoins,
            },
          ].map((step) => (
            <div
              key={step.num}
              className="relative bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-[0_12px_40px_rgba(26,22,18,0.08)] hover:-translate-y-1 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--umpi-accent)] text-white font-display text-xl grid place-items-center mb-4 relative z-10 shadow-md ring-4 ring-[var(--umpi-surface)]">
                {step.num}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[var(--umpi-accent-soft)] grid place-items-center mb-4">
                <step.icon className="w-7 h-7 text-[var(--umpi-accent)]" />
              </div>
              <h3 className="font-semibold text-base mb-2 text-[var(--umpi-text)]">{step.title}</h3>
              <p className="text-sm text-[var(--umpi-text2)] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TRUST & SAFETY (Task 5) ─── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="w-10 h-1 bg-[var(--umpi-accent)] rounded-full mx-auto mb-4" />
          <h2 className="font-display text-2xl sm:text-3xl mb-2">Por qué elegir UMPI</h2>
          <p className="text-sm text-[var(--umpi-text2)] max-w-lg mx-auto">
            Tu seguridad y confianza son nuestra prioridad
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Pagos protegidos",
              desc: "Todas las transacciones están respaldadas por MercadoPago. Si algo sale mal, te devolvemos tu dinero.",
              icon: ShieldCheck,
              bg: "var(--umpi-accent-soft)",
              color: "var(--umpi-accent)",
            },
            {
              title: "Vendedores verificados",
              desc: "Verificamos identidad y datos de cada vendedor. Buscá el sello verde antes de comprar.",
              icon: BadgeCheck,
              bg: "var(--umpi-green-soft)",
              color: "var(--umpi-green)",
            },
            {
              title: "Soporte 24/7",
              desc: "Nuestro equipo está disponible todos los días para ayudarte con cualquier duda o inconveniente.",
              icon: Headphones,
              bg: "var(--umpi-gold-soft)",
              color: "var(--umpi-gold)",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-6 hover:shadow-[0_12px_40px_rgba(26,22,18,0.08)] transition-all hover:-translate-y-1"
            >
              <div
                className="w-11 h-11 rounded-full grid place-items-center mb-4"
                style={{ background: item.bg }}
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <h3 className="font-semibold text-base mb-2 text-[var(--umpi-text)]">{item.title}</h3>
              <p className="text-sm text-[var(--umpi-text2)] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIOS ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
        <div className="w-10 h-1 bg-[var(--umpi-accent)] rounded-full mx-auto mb-4" />
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl mb-2 text-[var(--umpi-text)]">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-sm text-[var(--umpi-text2)]">
            Miles de personas ya confían en UMPI
          </p>
        </div>
        {testimonialsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Skeleton key={j} className="w-4 h-4 bg-[var(--umpi-surface2)]" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-[var(--umpi-accent)] opacity-20" />
                </div>
                <Skeleton className="h-4 w-full bg-[var(--umpi-surface2)] mb-2" />
                <Skeleton className="h-4 w-5/6 bg-[var(--umpi-surface2)] mb-2" />
                <Skeleton className="h-4 w-4/6 bg-[var(--umpi-surface2)] mb-4 flex-1" />
                <div className="flex items-center gap-3 pt-3 border-t border-[var(--umpi-border)]">
                  <Skeleton className="w-9 h-9 rounded-full bg-[var(--umpi-surface2)]" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24 bg-[var(--umpi-surface2)]" />
                    <Skeleton className="h-3 w-20 bg-[var(--umpi-surface2)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Carousel
            opts={{ align: "start", loop: true }}
            plugins={[
              Autoplay({
                delay: 4000,
                stopOnInteraction: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {displayTestimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id} className="pl-4 sm:basis-1/2 md:basis-1/3">
                  <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-6 hover:shadow-[0_12px_40px_rgba(26,22,18,0.08)] hover:-translate-y-1 transition-all h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < testimonial.rating
                                ? "fill-[var(--umpi-gold)] text-[var(--umpi-gold)]"
                                : "text-[var(--umpi-border)]"
                            }`}
                          />
                        ))}
                      </div>
                      <Quote className="w-6 h-6 text-[var(--umpi-accent)] opacity-20" />
                    </div>
                    <p className="text-sm text-[var(--umpi-text2)] leading-relaxed mb-4 flex-1">
                      &ldquo;{testimonial.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-3 border-t border-[var(--umpi-border)]">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-[var(--umpi-accent)] text-white text-xs font-semibold">
                          {testimonial.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-[var(--umpi-text)]">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-[var(--umpi-text2)]">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        )}
      </section>

      {/* ─── PREMIUM BANNER ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
        <div
          className="relative overflow-hidden rounded-2xl text-white p-8 sm:p-12"
          style={{ background: "linear-gradient(135deg, #1a0f2e 0%, #2d1b4e 50%, #4c1d95 100%)" }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--umpi-purple)] opacity-20 rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-6 items-center">
            <div>
              <Badge className="mb-3 bg-white/20 text-white border-0 gap-1">
                <Sparkles className="w-3 h-3" /> UMPI Premium
              </Badge>
              <h3 className="font-display text-2xl sm:text-3xl mb-2">
                Llevá tu negocio al siguiente nivel
              </h3>
              <p className="text-white/80 mb-4 max-w-md">
                Accedé al Top 10 semanal, publicaciones destacadas, badge verificado y
                estadísticas avanzadas. Planes desde <strong>$7.990/mes</strong>.
              </p>
              <Button
                onClick={() => onNavigate("suscripciones")}
                className="bg-white text-[var(--umpi-purple)] hover:bg-white/90 font-semibold gap-2 rounded-full"
              >
                Ver planes Premium
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Publicaciones", value: "Ilimitadas" },
                { label: "Soporte", value: "24/7 prioritario" },
                { label: "Verificado", value: "Badge ✓" },
                { label: "Top 10", value: "Acceso total" },
              ].map((item) => (
                <div key={item.label} className="bg-white/10 backdrop-blur rounded-xl p-3">
                  <div className="text-xs text-white/60 mb-0.5">{item.label}</div>
                  <div className="font-semibold text-white text-sm">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── DESTACADOS ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
        <div className="flex items-end justify-between mb-6">
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-[var(--umpi-gold-soft)] to-transparent rounded-xl -z-10" />
            <h2 className="font-display text-2xl sm:text-3xl mb-1 flex items-center gap-2">
              <Star className="w-6 h-6 fill-[var(--umpi-gold)] text-[var(--umpi-gold)]" />
              Destacados
            </h2>
            <p className="text-sm text-[var(--umpi-text2)]">
              Las mejores publicaciones, elegidas por UMPI
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => onNavigate("servicios")}
            className="text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent-soft)] gap-1"
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(featured || []).map((listing) => (
              <div key={listing.id} className="relative">
                {isNewListing(listing.createdAt) && (
                  <Badge className="absolute top-2 left-2 z-10 bg-[var(--umpi-green)] text-white text-[10px] px-2 py-0.5">
                    Nuevo
                  </Badge>
                )}
                <ListingCard
                  listing={listing}
                  onClick={() => onNavigate("detail", { id: listing.id, slug: listing.slug })}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl mb-2">
            Preguntas frecuentes
          </h2>
          <p className="text-sm text-[var(--umpi-text2)] max-w-lg mx-auto">
            Todo lo que necesitás saber para empezar a usar UMPI
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-4 sm:p-6">
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "¿Cómo publico un aviso en UMPI?",
                a: "Crear un aviso es muy simple: registrate gratis, hacé clic en \"Publicar\" y completá los datos de tu publicación. Podés agregar fotos, descripción, precio y ubicación. Tu aviso estará online en minutos y visible para miles de usuarios.",
              },
              {
                q: "¿Es gratis publicar en UMPI?",
                a: "Sí, UMPI ofrece publicaciones gratuitas en todas las categorías. Si querés mayor visibilidad, podés destacar tu publicación con los planes Premium o pagar un destaque individual. Las publicaciones gratis se renuevan automáticamente cada 30 días.",
              },
              {
                q: "¿Cómo funciona el pago con Mercado Pago?",
                a: "UMPI integra Mercado Pago como plataforma de pagos segura. Podés pagar y cobrar con tarjeta de crédito, débito, transferencia o dinero en cuenta. Todas las transacciones están protegidas por el programa de Compras Seguras de Mercado Pago.",
              },
              {
                q: "¿Qué son los planes Premium?",
                a: "Los planes Premium son suscripciones mensuales que te dan acceso a beneficios exclusivos: publicaciones ilimitadas, badge verificado, acceso al Top 10 semanal, estadísticas avanzadas y soporte prioritario 24/7. Los planes arrancan desde $7.990/mes.",
              },
              {
                q: "¿Cómo destaco mi publicación?",
                a: "Podés destacar tu publicación desde el panel de control de tu aviso. Elegí la opción \"Destacar\" y seleccioná el plan que mejor se adapte a tus necesidades: destaque semanal, quincenal o mensual. Las publicaciones destacadas aparecen en las primeras posiciones de búsqueda.",
              },
              {
                q: "¿Cómo reporto un problema?",
                a: "Si encontrás una publicación sospechosa o tenés un problema con otro usuario, podés reportarlo directamente desde la publicación usando el botón \"Denunciar\". También podés contactarnos por Telegram o escribir a soporte@umpi.com.ar. Nuestro equipo revisa cada reporte en menos de 24 horas.",
              },
            ].map((faq, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border-[var(--umpi-border)]">
                <AccordionTrigger className="text-sm font-semibold text-[var(--umpi-text)] hover:text-[var(--umpi-accent)] hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-[var(--umpi-text2)] leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── TRUST / PARTNERS ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
        <div className="text-center mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--umpi-text3)] mb-2">
            Empresas que confían en UMPI
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 md:gap-14">
          {[
            { name: "Mercado Pago", icon: CreditCard, color: "var(--umpi-blue)" },
            { name: "Correo Argentino", icon: Truck, color: "var(--umpi-green)" },
            { name: "AFIP", icon: Building, color: "var(--umpi-accent)" },
            { name: "Banco Nación", icon: Landmark, color: "var(--umpi-purple)" },
            { name: "Telegram", icon: MessageCircle, color: "var(--umpi-blue)" },
          ].map((partner) => (
            <div
              key={partner.name}
              className="flex items-center gap-2 text-[var(--umpi-text3)] hover:text-[var(--umpi-text)] umpi-transition group"
            >
              <partner.icon className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: partner.color }} />
              <span className="font-semibold text-sm sm:text-base">{partner.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
        <div className="relative overflow-hidden rounded-2xl p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg, var(--umpi-surface) 0%, var(--umpi-surface2) 50%, var(--umpi-surface) 100%)" }}>
          {/* Decorative dot pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "radial-gradient(circle, var(--umpi-text) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
          {/* Decorative background blobs */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-[var(--umpi-accent)] opacity-[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-[var(--umpi-purple)] opacity-[0.04] rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          
          <div className="relative">
            <Badge className="mb-4 bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] border-0 gap-1">
              <Flame className="w-3 h-3" /> Empezá hoy
            </Badge>
            <h2 className="font-display text-2xl sm:text-3xl mb-2">
              {get("cta.title", "¿Listo para empezar a vender o comprar?")}
            </h2>
            <p className="text-[var(--umpi-text2)] mb-2 max-w-xl mx-auto">
              {get(
                "cta.subtitle",
                "Publicá tu primer aviso gratis en menos de 2 minutos y llegá a miles de clientes en toda Argentina."
              )}
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-[var(--umpi-accent)]" />
              <span className="text-sm font-medium text-[var(--umpi-text)]">
                Más de <AnimatedCounter value={48000} suffix=" publicaciones activas" className="font-semibold" />
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => onNavigate("publicar")}
                className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white gap-2 rounded-full px-6 h-11 shadow-md shadow-[var(--umpi-accent)]/20"
              >
                {get("cta.button", "Publicar gratis")}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => onNavigate("suscripciones")}
                variant="outline"
                className="border-[var(--umpi-purple)] text-[var(--umpi-purple)] hover:bg-[var(--umpi-purple-soft)] gap-2 rounded-full px-6 h-11"
              >
                <Sparkles className="w-4 h-4" />
                Conocer Premium
              </Button>
            </div>
            <p className="text-xs text-[var(--umpi-text2)] mt-4">
              Sin tarjeta de crédito · Publicación gratis · Cancelá cuando quieras
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
