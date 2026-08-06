"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CssBarChart,
  DonutChart,
  EmptyState,
} from "@/components/admin/admin-helpers";
import { formatPrice, formatCurrencyCompact } from "@/lib/utils-umpi";

async function fetchStats() {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) throw new Error("Error");
  return res.json();
}

export function IngresosSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="p-6 animate-pulse h-[320px] bg-[var(--umpi-surface2)]" />
        <Card className="p-6 animate-pulse h-[260px] bg-[var(--umpi-surface2)]" />
      </div>
    );
  }

  const monthly = data?.monthlySeries || [];
  const totalRevenue = monthly.reduce((s: number, m: any) => s + m.amount, 0);
  const prevMonth = monthly[monthly.length - 2]?.amount || 0;
  const thisMonth = monthly[monthly.length - 1]?.amount || 0;
  const momTrend =
    prevMonth > 0 ? Math.round(((thisMonth - prevMonth) / prevMonth) * 100) : 0;

  const src = data?.revenueBySource || { subscriptions: 0, boosts: 0 };
  const srcTotal = (src.subscriptions || 0) + (src.boosts || 0);

  const donutData = [
    { label: "Suscripciones", value: src.subscriptions || 0, color: "var(--umpi-purple)" },
    { label: "Boosts", value: src.boosts || 0, color: "var(--umpi-accent)" },
  ];

  const catLabel: Record<string, string> = {
    servicio: "Servicios",
    auto: "Autos",
    propiedad: "Propiedades",
  };
  const topCategories = (data?.categoryDistribution || [])
    .map((c: any) => ({
      label: catLabel[c.type] || c.type,
      pct: c.pct,
      count: c.count,
      color: c.type === "servicio" ? "var(--umpi-accent)" : c.type === "auto" ? "var(--umpi-blue)" : "var(--umpi-gold)",
    }))
    .sort((a: any, b: any) => b.pct - a.pct);

  return (
    <div className="space-y-4">
      {/* Revenue chart */}
      <Card className="p-6 bg-white border-[var(--umpi-border)]">
        <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
          <div>
            <h3 className="font-semibold text-[var(--umpi-text)]">Ingresos por mes</h3>
            <p className="text-xs text-[var(--umpi-text2)] mt-0.5">
              Total 6 meses: <span className="font-semibold text-[var(--umpi-text)]">{formatPrice(totalRevenue)}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-[var(--umpi-text3)]">Este mes</div>
              <div className="font-display text-xl text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
                {formatCurrencyCompact(thisMonth)}
              </div>
            </div>
            <div
              className={`text-xs font-semibold px-2 py-1 rounded-md ${
                momTrend >= 0
                  ? "bg-[var(--umpi-green-soft)] text-[var(--umpi-green)]"
                  : "bg-[#fde8e8] text-[#dc2626]"
              }`}
            >
              {momTrend >= 0 ? "+" : ""}{momTrend}% MoM
            </div>
          </div>
        </div>
        <CssBarChart data={monthly} height={240} formatValue={(v) => formatCurrencyCompact(v)} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by source */}
        <Card className="p-6 bg-white border-[var(--umpi-border)]">
          <h3 className="font-semibold text-[var(--umpi-text)] mb-5">Ingresos por fuente (este mes)</h3>
          <DonutChart data={donutData} />
          <div className="mt-5 pt-4 border-t border-[var(--umpi-border)] grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--umpi-text3)]">Suscripciones</div>
              <div className="font-semibold text-[var(--umpi-purple)]">
                {formatPrice(src.subscriptions || 0)}
              </div>
              <div className="text-xs text-[var(--umpi-text3)]">
                {srcTotal > 0 ? Math.round(((src.subscriptions || 0) / srcTotal) * 100) : 0}% del total
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--umpi-text3)]">Boosts</div>
              <div className="font-semibold text-[var(--umpi-accent)]">
                {formatPrice(src.boosts || 0)}
              </div>
              <div className="text-xs text-[var(--umpi-text3)]">
                {srcTotal > 0 ? Math.round(((src.boosts || 0) / srcTotal) * 100) : 0}% del total
              </div>
            </div>
          </div>
        </Card>

        {/* Top categories by revenue */}
        <Card className="p-6 bg-white border-[var(--umpi-border)]">
          <h3 className="font-semibold text-[var(--umpi-text)] mb-5">Categorías con más ingresos</h3>
          {topCategories.length ? (
            <div className="space-y-3">
              {topCategories.map((c: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-[var(--umpi-text)]">{c.label}</span>
                    <span className="text-[var(--umpi-text2)]">{c.pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--umpi-surface2)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, c.pct)}%`,
                        background: c.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Sin datos suficientes" />
          )}
        </Card>
      </div>

      {/* Monthly comparison table */}
      <Card className="bg-white border-[var(--umpi-border)] gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-3">
          <h3 className="font-semibold text-[var(--umpi-text)]">Comparativo mensual</h3>
          <p className="text-xs text-[var(--umpi-text2)] mt-0.5">
            Ingresos y variación mes a mes (últimos 6 meses)
          </p>
        </div>
        <Table>
          <TableHeader className="bg-[var(--umpi-surface2)]">
            <TableRow className="border-[var(--umpi-border)]">
              <TableHead className="text-[var(--umpi-text2)] font-semibold px-6">Mes</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold">Ingresos</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold">Variación</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold px-6">% del total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...monthly].reverse().map((m: any, i: number, arr: any[]) => {
              const prev = arr[i + 1]?.amount || 0;
              const variacion = prev > 0 ? Math.round(((m.amount - prev) / prev) * 100) : 0;
              const pctTotal = totalRevenue > 0 ? Math.round((m.amount / totalRevenue) * 100) : 0;
              return (
                <TableRow key={i} className="border-[var(--umpi-border)]">
                  <TableCell className="px-6 font-medium text-[var(--umpi-text)]">{m.label}</TableCell>
                  <TableCell className="text-right font-semibold text-[var(--umpi-text)]">
                    {formatPrice(m.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {i < arr.length - 1 ? (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${
                          variacion >= 0
                            ? "bg-[var(--umpi-green-soft)] text-[var(--umpi-green)]"
                            : "bg-[#fde8e8] text-[#dc2626]"
                        }`}
                      >
                        {variacion >= 0 ? "↑" : "↓"} {Math.abs(variacion)}%
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--umpi-text3)]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-[var(--umpi-text2)] px-6">{pctTotal}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
