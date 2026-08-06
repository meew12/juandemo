"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Star, Crown, Ban, Play, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  KpiCard,
  StatusBadge,
  PlanBadge,
  MiniAvatar,
  HorizontalBars,
  Pagination,
  EmptyState,
} from "@/components/admin/admin-helpers";
import { formatPrice, formatDate } from "@/lib/utils-umpi";
import { toast } from "sonner";

async function fetchSubs(params: any) {
  const qs = new URLSearchParams();
  if (params.plan) qs.set("plan", params.plan);
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page));
  const res = await fetch(`/api/admin/subscriptions?${qs.toString()}`);
  if (!res.ok) throw new Error("Error");
  return res.json();
}

export function SuscripcionesSection() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ plan: "", status: "" });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subs", filters, page],
    queryFn: () => fetchSubs({ ...filters, page }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, action: "cancel" }),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Suscripción cancelada");
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast.error("Error al cancelar"),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, action: "reactivate" }),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Suscripción reactivada");
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
    },
    onError: () => toast.error("Error al reactivar"),
  });

  const updateFilter = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const k = data?.kpis;
  const planDist = (data?.planDistribution || []).map((p: any) => ({
    label: p.plan === "basico" ? "Básico" : p.plan === "pro" ? "Pro" : "Business",
    pct: p.pct,
    count: p.count,
    color:
      p.plan === "basico"
        ? "var(--umpi-text2)"
        : p.plan === "pro"
        ? "var(--umpi-purple)"
        : "var(--umpi-gold)",
  }));

  const top10 = data?.top10 || [];
  const subscribers = data?.subscribers || [];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Plan Básico"
          value={(k?.basico || 0).toLocaleString("es-AR")}
          icon={Users}
          iconColor="var(--umpi-text2)"
          trendLabel="Suscriptores activos"
        />
        <KpiCard
          label="Plan Pro"
          value={(k?.pro || 0).toLocaleString("es-AR")}
          icon={Star}
          iconColor="var(--umpi-purple)"
          trendLabel="Suscriptores activos"
        />
        <KpiCard
          label="Plan Business"
          value={(k?.business || 0).toLocaleString("es-AR")}
          icon={Crown}
          iconColor="var(--umpi-gold)"
          trendLabel="Suscriptores activos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan distribution */}
        <Card className="p-6 bg-white border-[var(--umpi-border)]">
          <h3 className="font-semibold text-[var(--umpi-text)] mb-5">Distribución de planes</h3>
          <HorizontalBars data={planDist} />
        </Card>

        {/* Top 10 management */}
        <Card className="lg:col-span-2 p-6 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[var(--umpi-text)]">Top 10 semanal</h3>
              <p className="text-xs text-[var(--umpi-text2)] mt-0.5">
                Publicaciones destacadas con mayor prioridad
              </p>
            </div>
            <Badge className="bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] border-[#f5c5b3]">
              {top10.length}/10
            </Badge>
          </div>
          {top10.length === 0 ? (
            <EmptyState message="No hay publicaciones en el Top 10 esta semana" />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {top10.map((l: any, i: number) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 p-2.5 rounded-md border border-[var(--umpi-border)] bg-[var(--umpi-surface2)]"
                >
                  <div
                    className="grid place-items-center rounded-full text-white font-bold shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      background: i === 0 ? "var(--umpi-gold)" : i === 1 ? "#9ca3af" : i === 2 ? "#b87333" : "var(--umpi-text3)",
                      fontSize: 12,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[var(--umpi-text)] truncate">{l.title}</div>
                    <div className="text-xs text-[var(--umpi-text2)]">
                      {l.seller.name} · {formatPrice(l.price, l.currency)}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--umpi-text3)] flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {l.views.toLocaleString("es-AR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-[var(--umpi-border)] gap-0">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.plan || "all"} onValueChange={(v) => updateFilter("plan", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los planes</SelectItem>
              <SelectItem value="basico">Básico</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="canceled">Canceladas</SelectItem>
              <SelectItem value="past_due">Vencidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Subscribers table */}
      <Card className="bg-white border-[var(--umpi-border)] gap-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-[var(--umpi-surface2)] sticky top-0">
            <TableRow className="border-[var(--umpi-border)]">
              <TableHead className="text-[var(--umpi-text2)] font-semibold px-4">Usuario</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Plan</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Inicio</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Próx. cargo</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Monto</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Estado</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold px-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-[var(--umpi-text3)]">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && subscribers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="No se encontraron suscriptores" />
                </TableCell>
              </TableRow>
            )}
            {subscribers.map((s: any) => (
              <TableRow key={s.id} className="border-[var(--umpi-border)]">
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <MiniAvatar
                      initials={s.user.initials}
                      size={32}
                      color={s.plan === "pro" ? "var(--umpi-purple)" : s.plan === "business" ? "var(--umpi-gold)" : "var(--umpi-text2)"}
                    />
                    <div>
                      <div className="font-medium text-[var(--umpi-text)]">{s.user.name}</div>
                      <div className="text-xs text-[var(--umpi-text3)]">{s.user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><PlanBadge plan={s.plan} /></TableCell>
                <TableCell className="text-sm text-[var(--umpi-text2)]">{formatDate(s.startDate)}</TableCell>
                <TableCell className="text-sm text-[var(--umpi-text2)]">
                  {s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : "—"}
                </TableCell>
                <TableCell className="text-sm font-semibold text-[var(--umpi-text)]">
                  {formatPrice(s.amount)}
                  <span className="text-xs text-[var(--umpi-text3)] font-normal">/mes</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                  {s.cancelAtPeriodEnd && s.status === "active" && (
                    <div className="text-[10px] text-[var(--umpi-gold)] mt-0.5">Cancela al fin del período</div>
                  )}
                </TableCell>
                <TableCell className="px-4 text-right">
                  {s.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[#dc2626] border-[#f5c2c2] hover:bg-[#fde8e8]"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (confirm("¿Cancelar esta suscripción?")) {
                          cancelMutation.mutate(s.id);
                        }
                      }}
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" />
                      Cancelar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[var(--umpi-green)] border-[#cfe6da] hover:bg-[var(--umpi-green-soft)]"
                      disabled={reactivateMutation.isPending}
                      onClick={() => reactivateMutation.mutate(s.id)}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      Reactivar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
