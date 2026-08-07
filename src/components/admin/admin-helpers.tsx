"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

// ─────────────────────────── Status badges ───────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    // listings
    active: { label: "Activa", cls: "bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[#cfe6da]" },
    pending: { label: "Pendiente", cls: "bg-[var(--umpi-gold-soft)] text-[var(--umpi-gold)] border-[#ecdfb8]" },
    paused: { label: "Pausada", cls: "bg-[var(--umpi-gold-soft)] text-[var(--umpi-gold)] border-[#ecdfb8]" },
    rejected: { label: "Rechazada", cls: "bg-[#fde8e8] text-[#dc2626] border-[#f5c2c2]" },
    sold: { label: "Vendida", cls: "bg-[var(--umpi-blue-soft)] text-[var(--umpi-blue)] border-[#c8d6ef]" },
    // transactions
    approved: { label: "Aprobado", cls: "bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[#cfe6da]" },
    refunded: { label: "Reembolsado", cls: "bg-[#f0ecf8] text-[var(--umpi-purple)] border-[#d8ccf0]" },
    canceled: { label: "Cancelado", cls: "bg-[#f3f1ee] text-[var(--umpi-text2)] border-[var(--umpi-border)]" },
    // reports
    open: { label: "Abierto", cls: "bg-[#fde8e8] text-[#dc2626] border-[#f5c2c2]" },
    reviewing: { label: "En revisión", cls: "bg-[var(--umpi-gold-soft)] text-[var(--umpi-gold)] border-[#ecdfb8]" },
    resolved: { label: "Resuelto", cls: "bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[#cfe6da]" },
    dismissed: { label: "Desestimado", cls: "bg-[#f3f1ee] text-[var(--umpi-text2)] border-[var(--umpi-border)]" },
    // reviews
    hidden: { label: "Oculta", cls: "bg-[#f3f1ee] text-[var(--umpi-text2)] border-[var(--umpi-border)]" },
    deleted: { label: "Eliminada", cls: "bg-[#fde8e8] text-[#dc2626] border-[#f5c2c2]" },
    // subscriptions
    past_due: { label: "Pago vencido", cls: "bg-[#fde8e8] text-[#dc2626] border-[#f5c2c2]" },
  };
  const cfg = map[status] || { label: status, cls: "bg-[#f3f1ee] text-[var(--umpi-text2)] border-[var(--umpi-border)]" };
  return (
    <Badge variant="outline" className={cn("text-[11px] font-semibold capitalize", cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    basico: { label: "Básico", cls: "bg-[#f3f1ee] text-[var(--umpi-text2)] border-[var(--umpi-border)]" },
    pro: { label: "Pro", cls: "bg-[var(--umpi-purple-soft)] text-[var(--umpi-purple)] border-[#d8ccf0]" },
    business: { label: "Business", cls: "bg-[var(--umpi-gold-soft)] text-[var(--umpi-gold)] border-[#ecdfb8]" },
  };
  const cfg = map[plan] || map.basico;
  return (
    <Badge variant="outline" className={cn("text-[11px] font-semibold", cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <Badge variant="outline" className="text-[11px] font-semibold bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] border-[#f5c5b3]">
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] font-semibold bg-[#f3f1ee] text-[var(--umpi-text2)] border-[var(--umpi-border)]">
      Usuario
    </Badge>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <Badge variant="outline" className="text-[11px] font-semibold bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[#cfe6da]">
        Verificado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] font-semibold bg-[#f3f1ee] text-[var(--umpi-text3)] border-[var(--umpi-border)]">
      No verificado
    </Badge>
  );
}

// ─────────────────────────── KPI Card ───────────────────────────

export function KpiCard({
  label,
  value,
  trend,
  trendLabel,
  icon: Icon,
  iconColor = "var(--umpi-accent)",
  sparkline,
}: {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon?: any;
  iconColor?: string;
  sparkline?: React.ReactNode;
}) {
  const trendUp = (trend ?? 0) >= 0;
  return (
    <Card className="p-5 gap-0 bg-white border-[var(--umpi-border)]">
      <div className="flex items-start justify-between mb-3">
        <div
          className="grid place-items-center rounded-lg"
          style={{
            width: 40,
            height: 40,
            background: `${iconColor}15`,
            color: iconColor,
          }}
        >
          {Icon ? <Icon className="w-5 h-5" /> : null}
        </div>
        <div className="flex items-center gap-2">
          {sparkline && <div className="shrink-0">{sparkline}</div>}
          {typeof trend === "number" && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
                trendUp
                  ? "bg-[var(--umpi-green-soft)] text-[var(--umpi-green)]"
                  : "bg-[#fde8e8] text-[#dc2626]"
              )}
            >
              {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendUp ? "+" : ""}
              {trend}%
            </div>
          )}
        </div>
      </div>
      <div className="font-display text-3xl leading-none text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
        {value}
      </div>
      <div className="mt-1.5 text-sm text-[var(--umpi-text2)]">{label}</div>
      {trendLabel && <div className="mt-0.5 text-xs text-[var(--umpi-text3)]">{trendLabel}</div>}
    </Card>
  );
}

// ─────────────────────────── Mini avatar (initials) ───────────────────────────

export function MiniAvatar({
  initials,
  size = 32,
  color = "var(--umpi-accent)",
}: {
  initials: string;
  size?: number;
  color?: string;
}) {
  return (
    <div
      className="grid place-items-center rounded-full text-white font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.4,
      }}
    >
      {initials.substring(0, 2)}
    </div>
  );
}

// ─────────────────────────── CSS Bar chart ───────────────────────────

export function CssBarChart({
  data,
  height = 200,
  accentColor = "var(--umpi-accent)",
  formatValue,
}: {
  data: { label: string; amount: number }[];
  height?: number;
  accentColor?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(8, (d.amount / max) * (height - 40));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative flex-1 flex items-end w-full justify-center">
              <div
                className="w-full max-w-[44px] rounded-t-md transition-all hover:opacity-80"
                style={{
                  height: h,
                  background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
                }}
              />
              <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-[var(--umpi-text)] bg-white border border-[var(--umpi-border)] rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap">
                {formatValue ? formatValue(d.amount) : d.amount}
              </div>
            </div>
            <div className="text-xs text-[var(--umpi-text2)] font-medium">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Horizontal Bars ───────────────────────────

export function HorizontalBars({
  data,
}: {
  data: { label: string; pct: number; count?: number; color?: string }[];
}) {
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[var(--umpi-text)]">{d.label}</span>
            <span className="text-[var(--umpi-text2)]">
              {d.count !== undefined ? `${d.count} · ` : ""}
              {d.pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--umpi-surface2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, d.pct)}%`,
                background: d.color || "var(--umpi-accent)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── Donut chart (SVG) ───────────────────────────

export function DonutChart({
  data,
  size = 160,
  thickness = 22,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  // Pre-compute each segment's dash offset (accumulating)
  const segments = data.reduce<
    { len: number; offset: number; color: string; value: number; label: string }[]
  >((acc, d) => {
    const len = (d.value / total) * circumference;
    const offset = acc.length === 0 ? 0 : acc[acc.length - 1].offset + acc[acc.length - 1].len;
    acc.push({ len, offset, color: d.color, value: d.value, label: d.label });
    return acc;
  }, []);
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--umpi-surface2)"
            strokeWidth={thickness}
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${seg.len} ${circumference - seg.len}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-2xl text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
              {total}
            </div>
            <div className="text-xs text-[var(--umpi-text2)]">total</div>
          </div>
        </div>
      </div>
      <div className="space-y-2 min-w-[140px]">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
            <span className="text-[var(--umpi-text2)]">{d.label}</span>
            <span className="ml-auto font-semibold text-[var(--umpi-text)]">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── Empty state ───────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-[var(--umpi-text3)] text-sm">{message}</div>
  );
}

// ─────────────────────────── Pagination ───────────────────────────

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-md text-sm border border-[var(--umpi-border)] bg-white text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Anterior
      </button>
      <span className="text-sm text-[var(--umpi-text2)] px-2">
        Página <span className="font-semibold text-[var(--umpi-text)]">{page}</span> de{" "}
        <span className="font-semibold text-[var(--umpi-text)]">{totalPages}</span>
      </span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-md text-sm border border-[var(--umpi-border)] bg-white text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Siguiente →
      </button>
    </div>
  );
}
