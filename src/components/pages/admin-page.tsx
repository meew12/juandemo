"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  DollarSign,
  Flag,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  FolderTree,
  Crown,
  Settings,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { getInitials } from "@/lib/utils-umpi";
import { cn } from "@/lib/utils";
import { DashboardSection } from "@/components/admin/sections/dashboard-section";
import { UsuariosSection } from "@/components/admin/sections/usuarios-section";
import { PublicacionesSection } from "@/components/admin/sections/publicaciones-section";
import { SuscripcionesSection } from "@/components/admin/sections/suscripciones-section";
import { PagosSection } from "@/components/admin/sections/pagos-section";
import { IngresosSection } from "@/components/admin/sections/ingresos-section";
import { ReportesSection } from "@/components/admin/sections/reportes-section";
import { ResenasSection } from "@/components/admin/sections/resenas-section";
import { CategoriasSection } from "@/components/admin/sections/categorias-section";
import { PlanesSection } from "@/components/admin/sections/planes-section";
import { ConfiguracionSection } from "@/components/admin/sections/configuracion-section";
import { MercadoPagoSection } from "@/components/admin/sections/mercadopago-section";

type AdminPageProps = {
  onNavigate: (page: string, params?: any) => void;
};

type SectionKey =
  | "dashboard"
  | "usuarios"
  | "publicaciones"
  | "categorias"
  | "suscripciones"
  | "planes"
  | "pagos"
  | "ingresos"
  | "reportes"
  | "resenas"
  | "mercadopago"
  | "configuracion";

const NAV_SECTIONS: {
  group: string;
  items: {
    key: SectionKey;
    label: string;
    icon: any;
    badge?: { type: "pro" | "count"; value?: number | string };
  }[];
}[] = [
  {
    group: "General",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "usuarios", label: "Usuarios", icon: Users },
      { key: "publicaciones", label: "Publicaciones", icon: FileText },
      { key: "categorias", label: "Categorías", icon: FolderTree },
    ],
  },
  {
    group: "Monetización",
    items: [
      {
        key: "suscripciones",
        label: "Suscripciones",
        icon: CreditCard,
        badge: { type: "pro", value: "Pro" },
      },
      { key: "planes", label: "Planes", icon: Crown, badge: { type: "pro", value: "Pro" } },
      { key: "pagos", label: "Pagos", icon: DollarSign },
      { key: "ingresos", label: "Ingresos", icon: TrendingUp },
    ],
  },
  {
    group: "Moderación",
    items: [
      { key: "reportes", label: "Reportes", icon: Flag, badge: { type: "count" } },
      { key: "resenas", label: "Reseñas", icon: MessageSquare },
    ],
  },
  {
    group: "Sistema",
    items: [
      { key: "mercadopago", label: "MercadoPago", icon: Wallet },
      { key: "configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const SECTION_TITLES: Record<SectionKey, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Resumen general de la plataforma" },
  usuarios: { title: "Usuarios", subtitle: "Gestión de usuarios registrados" },
  publicaciones: { title: "Publicaciones", subtitle: "Administra todas las publicaciones" },
  categorias: { title: "Categorías", subtitle: "Crea y administra las categorías del marketplace" },
  suscripciones: { title: "Suscripciones", subtitle: "Planes premium y suscriptores activos" },
  planes: { title: "Planes", subtitle: "Creá y editá los planes de suscripción" },
  pagos: { title: "Pagos", subtitle: "Transacciones y reembolsos" },
  ingresos: { title: "Ingresos", subtitle: "Análisis financiero de la plataforma" },
  reportes: { title: "Reportes", subtitle: "Casos de moderación abiertos" },
  resenas: { title: "Reseñas", subtitle: "Modera las reseñas de los usuarios" },
  mercadopago: { title: "MercadoPago", subtitle: "Configurá las credenciales de pago de MercadoPago" },
  configuracion: { title: "Configuración", subtitle: "Editá los textos del sitio desde un panel central" },
};

async function fetchStats() {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) return null;
  return res.json();
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { data: session } = useSession();
  const [section, setSection] = useState<SectionKey>("dashboard");

  // Lightweight fetch just for the open reports badge in the sidebar
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
    staleTime: 30_000,
  });
  const openReports = stats?.kpis?.pendingReports || 0;

  const adminName = session?.user?.name || "Admin";
  const adminInitials = getInitials(adminName);

  const sectionInfo = SECTION_TITLES[section];

  const renderSection = () => {
    switch (section) {
      case "dashboard":
        return <DashboardSection />;
      case "usuarios":
        return <UsuariosSection />;
      case "publicaciones":
        return <PublicacionesSection />;
      case "categorias":
        return <CategoriasSection />;
      case "suscripciones":
        return <SuscripcionesSection />;
      case "planes":
        return <PlanesSection />;
      case "pagos":
        return <PagosSection />;
      case "ingresos":
        return <IngresosSection />;
      case "reportes":
        return <ReportesSection />;
      case "resenas":
        return <ResenasSection />;
      case "mercadopago":
        return <MercadoPagoSection />;
      case "configuracion":
        return <ConfiguracionSection />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--umpi-bg)]">
      {/* ─── SIDEBAR ─── */}
      <aside
        className="sticky top-0 h-screen flex flex-col shrink-0"
        style={{
          width: 240,
          background: "#1a1612",
          borderRight: "1px solid #2d2520",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#2d2520]">
          <div className="flex items-center gap-2.5">
            <div
              className="grid place-items-center text-white font-display shrink-0"
              style={{
                width: 32,
                height: 32,
                background: "var(--umpi-accent)",
                borderRadius: 8,
                fontSize: 18,
                letterSpacing: "-1px",
              }}
            >
              U
            </div>
            <div className="leading-none">
              <div
                className="font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-sora)", fontSize: 16, letterSpacing: "-0.3px" }}
              >
                UMP<span style={{ color: "var(--umpi-accent)" }}>I</span>
              </div>
              <div className="text-[10px] text-[#9d9890] mt-0.5 uppercase tracking-wider">
                Admin Panel
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {NAV_SECTIONS.map((s) => (
            <div key={s.group} className="mb-5">
              <div className="px-5 mb-2 text-[10px] uppercase tracking-wider text-[#6b6560] font-semibold">
                {s.group}
              </div>
              <div className="space-y-0.5 px-3">
                {s.items.map((item) => {
                  const active = section === item.key;
                  const Icon = item.icon;
                  const showCountBadge =
                    item.badge?.type === "count" && item.key === "reportes" && openReports > 0;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSection(item.key)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all relative",
                        active
                          ? "bg-[#2d2520] text-white"
                          : "text-[#9d9890] hover:text-white hover:bg-[#2d2520]/60"
                      )}
                      style={active ? { boxShadow: "inset 3px 0 0 var(--umpi-accent)" } : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge?.type === "pro" && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{
                            background: "rgba(124, 58, 237, 0.18)",
                            color: "#a78bfa",
                          }}
                        >
                          {item.badge.value as string}
                        </span>
                      )}
                      {showCountBadge && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                          style={{
                            background: "var(--umpi-accent)",
                            color: "white",
                          }}
                        >
                          {openReports}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: view site */}
        <div className="px-3 py-4 border-t border-[#2d2520]">
          <button
            onClick={() => onNavigate("home")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-[#9d9890] hover:text-white hover:bg-[#2d2520]/60 transition-all"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            Ver sitio
            <span className="ml-auto text-[#9d9890]">→</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[var(--umpi-bg)]/95 backdrop-blur-md border-b border-[var(--umpi-border)]"
          style={{ minHeight: 68 }}
        >
          <div>
            <h1
              className="text-xl font-semibold text-[var(--umpi-text)] leading-tight"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              {sectionInfo.title}
            </h1>
            <p className="text-xs text-[var(--umpi-text2)] mt-0.5">{sectionInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--umpi-text2)] px-2.5 py-1.5 rounded-md bg-[var(--umpi-surface)] border border-[var(--umpi-border)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--umpi-green)]" />
              <span className="font-medium">Modo admin</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Avatar
                className="w-9 h-9 border-2"
                style={{ borderColor: "var(--umpi-accent)" }}
              >
                <AvatarFallback
                  className="text-white font-semibold"
                  style={{ background: "var(--umpi-accent)" }}
                >
                  {adminInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-semibold text-[var(--umpi-text)]">{adminName}</div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold mt-0.5 bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] border-[#f5c5b3]"
                >
                  Administrador
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-x-hidden">{renderSection()}</main>
      </div>
    </div>
  );
}
