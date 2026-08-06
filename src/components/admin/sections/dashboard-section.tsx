"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, FileText, DollarSign, Star, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  KpiCard,
  StatusBadge,
  MiniAvatar,
  EmptyState,
} from "@/components/admin/admin-helpers";
import { formatPrice, formatCurrencyCompact, formatDate, timeAgo } from "@/lib/utils-umpi";

async function fetchStats() {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) throw new Error("Error");
  return res.json();
}

// ─── Revenue chart config ───
const revenueChartConfig: ChartConfig = {
  revenue: {
    label: "Ingresos",
    color: "#e84c1e",
  },
};

// ─── Category chart config ───
const categoryChartConfig: ChartConfig = {
  servicio: {
    label: "Servicios",
    color: "#e84c1e",
  },
  auto: {
    label: "Autos",
    color: "#c49a2a",
  },
  propiedad: {
    label: "Propiedades",
    color: "#1a7a4a",
  },
};

// ─── Sparkline component ───
function Sparkline({
  data,
  color = "#e84c1e",
  width = 80,
  height = 40,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width, height }}>
      <ChartContainer config={{ value: { label: "Value", color } }} className="!aspect-auto" style={{ width, height }}>
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function DashboardSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse h-[140px] bg-[var(--umpi-surface2)]" />
          ))}
        </div>
        <Card className="p-6 animate-pulse h-[280px] bg-[var(--umpi-surface2)]" />
      </div>
    );
  }

  const k = data?.kpis;

  // ─── Build revenue data for AreaChart ───
  const revenueData = (data?.monthlySeries || []).map((m: any) => ({
    month: m.label,
    revenue: m.amount,
  }));

  // ─── Build category data for PieChart ───
  const catColorMap: Record<string, string> = {
    servicio: "#e84c1e",
    auto: "#c49a2a",
    propiedad: "#1a7a4a",
  };
  const catLabelMap: Record<string, string> = {
    servicio: "Servicios",
    auto: "Autos",
    propiedad: "Propiedades",
  };
  const categoryData = (data?.categoryDistribution || []).map((c: any) => ({
    name: catLabelMap[c.type] || c.type,
    value: c.count,
    fill: catColorMap[c.type] || "#e84c1e",
    key: c.type,
  }));
  const totalCatCount = categoryData.reduce((s: number, c: any) => s + c.value, 0);

  // ─── Sparkline mock data (6 months trend) ───
  const userGrowthData = [120, 145, 160, 180, 210, k?.totalUsers || 240];
  const listingsGrowthData = [85, 100, 115, 130, 150, k?.activeListings || 170];

  return (
    <div className="space-y-6">
      {/* KPI cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total usuarios"
          value={k?.totalUsers?.toLocaleString("es-AR") || "0"}
          trend={12}
          trendLabel="vs mes anterior"
          icon={Users}
          iconColor="var(--umpi-blue)"
          sparkline={<Sparkline data={userGrowthData} color="#e84c1e" />}
        />
        <KpiCard
          label="Publicaciones activas"
          value={k?.activeListings?.toLocaleString("es-AR") || "0"}
          trend={8}
          trendLabel="vs mes anterior"
          icon={FileText}
          iconColor="var(--umpi-accent)"
          sparkline={<Sparkline data={listingsGrowthData} color="#1a7a4a" />}
        />
        <KpiCard
          label="Ingresos del mes"
          value={formatCurrencyCompact(k?.monthRevenue || 0)}
          trend={k?.revenueTrend ?? 0}
          trendLabel="vs mes anterior"
          icon={DollarSign}
          iconColor="var(--umpi-green)"
        />
        <KpiCard
          label="Suscripciones activas"
          value={k?.activeSubscriptions?.toLocaleString("es-AR") || "0"}
          trend={5}
          trendLabel="vs mes anterior"
          icon={Star}
          iconColor="var(--umpi-purple)"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Area Chart */}
        <Card className="lg:col-span-2 p-6 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-[var(--umpi-text)]">Ingresos últimos 6 meses</h3>
              <p className="text-xs text-[var(--umpi-text2)] mt-0.5">
                Total: {formatPrice(data?.monthlySeries?.reduce((s: number, m: any) => s + m.amount, 0) || 0)}
              </p>
            </div>
          </div>
          <ChartContainer config={revenueChartConfig} className="!aspect-auto h-[260px] w-full">
            <AreaChart data={revenueData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e84c1e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#e84c1e" stopOpacity={0.02} />
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
                tickFormatter={(v: number) => formatCurrencyCompact(v)}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatPrice(value as number)}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#e84c1e"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ChartContainer>
        </Card>

        {/* Category Pie Chart */}
        <Card className="p-6 bg-white border-[var(--umpi-border)]">
          <h3 className="font-semibold text-[var(--umpi-text)] mb-5">Distribución por categoría</h3>
          {categoryData.length ? (
            <div>
              <ChartContainer config={categoryChartConfig} className="!aspect-auto h-[220px] w-full mx-auto">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="name"
                        formatter={(value, name) => (
                          <span className="font-semibold">
                            {value} ({Math.round(((value as number) / totalCatCount) * 100)}%)
                          </span>
                        )}
                      />
                    }
                  />
                  {/* Legend dentro del ChartContainer para que useChart() tenga contexto */}
                  <ChartLegend
                    content={
                      <ChartLegendContent nameKey="name" />
                    }
                  />
                </PieChart>
              </ChartContainer>
              {/* Center total label */}
              <div className="text-center -mt-4 mb-2">
                <div className="font-display text-2xl text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
                  {totalCatCount}
                </div>
                <div className="text-xs text-[var(--umpi-text2)]">total</div>
              </div>
            </div>
          ) : (
            <EmptyState message="Sin datos" />
          )}
        </Card>
      </div>

      {/* Recent listings table */}
      <Card className="bg-white border-[var(--umpi-border)]">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--umpi-text)]">Publicaciones recientes</h3>
            <p className="text-xs text-[var(--umpi-text2)] mt-0.5">Últimas 5 publicaciones creadas</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--umpi-border)]">
              <TableHead className="text-[var(--umpi-text2)] font-medium">Publicación</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-medium">Vendedor</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-medium">Fecha</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-medium">Estado</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-medium">Vistas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.recentListings || []).map((l: any) => (
              <TableRow key={l.id} className="border-[var(--umpi-border)]">
                <TableCell>
                  <div className="font-medium text-[var(--umpi-text)] max-w-[280px] truncate">
                    {l.title}
                  </div>
                  <div className="text-xs text-[var(--umpi-text2)]">{formatPrice(l.price, l.currency)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MiniAvatar initials={l.seller.initials} size={28} />
                    <div>
                      <div className="text-sm font-medium text-[var(--umpi-text)]">{l.seller.name}</div>
                      {l.seller.verified && (
                        <div className="text-[10px] text-[var(--umpi-green)] font-semibold">✓ Verificado</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-[var(--umpi-text2)]">{formatDate(l.createdAt)}</div>
                  <div className="text-xs text-[var(--umpi-text3)]">{timeAgo(l.createdAt)}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={l.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--umpi-text)]">
                    <Eye className="w-3.5 h-3.5 text-[var(--umpi-text3)]" />
                    {l.views.toLocaleString("es-AR")}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.recentListings?.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState message="No hay publicaciones recientes" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
