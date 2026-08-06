"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Crown,
  Check,
  X,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { formatPrice, formatCurrencyCompact } from "@/lib/utils-umpi";

type Plan = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string | null;
  features: string[];
  maxListings: number;
  maxFeatured: number;
  badgeVerified: boolean;
  top10Access: boolean;
  multiUser: number;
  apiAccess: boolean;
  prioritySupport: boolean;
  monthlyReport: boolean;
  invoiceType: string | null;
  active: boolean;
  order: number;
};

async function fetchPlans() {
  const res = await fetch("/api/admin/plans");
  if (!res.ok) throw new Error("Error");
  return res.json();
}

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  basico: { bg: "bg-[var(--umpi-surface)]", text: "text-[var(--umpi-text2)]", border: "border-[var(--umpi-border)]", accent: "var(--umpi-text2)" },
  pro: { bg: "bg-[var(--umpi-purple-soft)]", text: "text-[var(--umpi-purple)]", border: "border-[#d8ccf0]", accent: "var(--umpi-purple)" },
  business: { bg: "bg-[var(--umpi-gold-soft)]", text: "text-[var(--umpi-gold)]", border: "border-[#ecdfb8]", accent: "var(--umpi-gold)" },
};

function getColor(slug: string) {
  if (slug.includes("business")) return PLAN_COLORS.business;
  if (slug.includes("pro")) return PLAN_COLORS.pro;
  return PLAN_COLORS.basico;
}

export function PlanesSection() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [featuresText, setFeaturesText] = useState("");

  const [form, setForm] = useState({
    slug: "",
    name: "",
    price: 0,
    currency: "ARS",
    interval: "month",
    description: "",
    maxListings: 1,
    maxFeatured: 0,
    badgeVerified: false,
    top10Access: false,
    multiUser: 1,
    apiAccess: false,
    prioritySupport: false,
    monthlyReport: false,
    invoiceType: "",
    active: true,
    order: 0,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: fetchPlans,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Plan creado");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Error al crear"),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Plan actualizado");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/plans?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.deactivated) {
        toast.info(data.message);
      } else {
        toast.success("Plan eliminado");
      }
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message || "Error al eliminar"),
  });

  const toggleActive = (plan: Plan) => {
    updateMutation.mutate({ planId: plan.id, active: !plan.active });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      slug: "",
      name: "",
      price: 0,
      currency: "ARS",
      interval: "month",
      description: "",
      maxListings: 1,
      maxFeatured: 0,
      badgeVerified: false,
      top10Access: false,
      multiUser: 1,
      apiAccess: false,
      prioritySupport: false,
      monthlyReport: false,
      invoiceType: "",
      active: true,
      order: (data?.plans?.length || 0) + 1,
    });
    setFeaturesText("");
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      slug: plan.slug,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      description: plan.description || "",
      maxListings: plan.maxListings,
      maxFeatured: plan.maxFeatured,
      badgeVerified: plan.badgeVerified,
      top10Access: plan.top10Access,
      multiUser: plan.multiUser,
      apiAccess: plan.apiAccess,
      prioritySupport: plan.prioritySupport,
      monthlyReport: plan.monthlyReport,
      invoiceType: plan.invoiceType || "",
      active: plan.active,
      order: plan.order,
    });
    setFeaturesText(plan.features.join("\n"));
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featuresArr = featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: any = {
      ...form,
      price: Number(form.price),
      maxListings: Number(form.maxListings),
      maxFeatured: Number(form.maxFeatured),
      multiUser: Number(form.multiUser),
      order: Number(form.order),
      features: featuresArr,
      invoiceType: form.invoiceType || null,
      description: form.description || null,
    };

    if (editing) {
      updateMutation.mutate({ planId: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const plans: Plan[] = data?.plans || [];
  const k = data?.kpis;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-[var(--umpi-gold)]" />
            <span className="text-xs text-[var(--umpi-text2)]">Planes totales</span>
          </div>
          <div className="text-2xl font-display text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
            {k?.totalPlans || 0}
          </div>
        </Card>
        <Card className="p-4 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-[var(--umpi-green)]" />
            <span className="text-xs text-[var(--umpi-text2)]">Planes activos</span>
          </div>
          <div className="text-2xl font-display text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
            {k?.activePlans || 0}
          </div>
        </Card>
        <Card className="p-4 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-[var(--umpi-purple)]" />
            <span className="text-xs text-[var(--umpi-text2)]">Suscripciones activas</span>
          </div>
          <div className="text-2xl font-display text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
            {(k?.activeSubs || 0).toLocaleString("es-AR")}
          </div>
        </Card>
        <Card className="p-4 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[var(--umpi-green)]" />
            <span className="text-xs text-[var(--umpi-text2)]">Ingresos por planes</span>
          </div>
          <div className="text-2xl font-display text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
            {formatCurrencyCompact(k?.totalRevenue || 0)}
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refrescar">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button onClick={openCreate} className="ml-auto" style={{ background: "var(--umpi-accent)", color: "white" }}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo plan
        </Button>
      </div>

      {/* Grid de planes */}
      {isLoading ? (
        <div className="py-12 text-center text-[var(--umpi-text2)] text-sm">Cargando planes...</div>
      ) : plans.length === 0 ? (
        <Card className="py-12 bg-white border-[var(--umpi-border)] text-center">
          <Crown className="w-10 h-10 mx-auto mb-3 text-[var(--umpi-text3)]" />
          <p className="text-[var(--umpi-text2)] text-sm mb-4">No hay planes configurados.</p>
          <Button onClick={openCreate} style={{ background: "var(--umpi-accent)", color: "white" }}>
            <Plus className="w-4 h-4 mr-1.5" />
            Crear primer plan
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const colors = getColor(plan.slug);
            return (
              <Card
                key={plan.id}
                className={`p-5 bg-white border-2 transition-all hover:shadow-md ${plan.active ? colors.border : "border-[var(--umpi-border)] opacity-60"}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="grid place-items-center rounded-lg shrink-0"
                      style={{ width: 36, height: 36, background: `${colors.accent}15`, color: colors.accent }}
                    >
                      <Crown className="w-5 h-5" />
                    </div>
                    <div className="leading-tight">
                      <div className="font-display text-lg text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-sora)" }}>
                        {plan.name}
                      </div>
                      <code className="text-xs text-[var(--umpi-text3)]">{plan.slug}</code>
                    </div>
                  </div>
                  {plan.active ? (
                    <Badge variant="outline" className={`text-[10px] font-semibold ${colors.bg} ${colors.text} ${colors.border}`}>
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-semibold bg-[#f3f1ee] text-[var(--umpi-text3)] border-[var(--umpi-border)]">
                      Inactivo
                    </Badge>
                  )}
                </div>

                {/* Precio */}
                <div className="mb-3">
                  <span className="text-3xl font-display text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  <span className="text-sm text-[var(--umpi-text2)] ml-1">/ {plan.interval === "month" ? "mes" : plan.interval === "year" ? "año" : plan.interval}</span>
                </div>

                {plan.description && (
                  <p className="text-xs text-[var(--umpi-text2)] mb-3 line-clamp-2">{plan.description}</p>
                )}

                {/* Features principales */}
                <div className="space-y-1.5 mb-4 min-h-[60px]">
                  <FeatureRow ok={plan.maxListings > 0} text={`Hasta ${plan.maxListings} publicaciones`} />
                  <FeatureRow ok={plan.maxFeatured > 0} text={`${plan.maxFeatured} destacadas incluidas`} />
                  <FeatureRow ok={plan.badgeVerified} text="Insignia verificado" />
                  <FeatureRow ok={plan.top10Access} text="Acceso al Top 10" />
                  <FeatureRow ok={plan.prioritySupport} text="Soporte prioritario" />
                  {plan.features.length > 5 && (
                    <p className="text-xs text-[var(--umpi-text3)]">+{plan.features.length - 5} más...</p>
                  )}
                </div>

                {/* Facturación */}
                {plan.invoiceType && (
                  <div className="mb-3">
                    <Badge variant="outline" className="text-[10px] font-semibold bg-[var(--umpi-surface)] text-[var(--umpi-text2)] border-[var(--umpi-border)]">
                      Factura tipo {plan.invoiceType}
                    </Badge>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-3 border-t border-[var(--umpi-border)]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)]"
                    onClick={() => openEdit(plan)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-[var(--umpi-text2)] hover:text-red-600"
                    onClick={() => setDeleteTarget(plan)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Eliminar
                  </Button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-xs text-[var(--umpi-text3)]">Activo</span>
                    <Switch
                      checked={plan.active}
                      onCheckedChange={() => toggleActive(plan)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plan" : "Nuevo plan de suscripción"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Modificá los detalles del plan. Los cambios se reflejan en la página de suscripciones."
                : "Configurá un nuevo plan de suscripción para los usuarios."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Datos básicos */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--umpi-text)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--umpi-accent)" }} />
                Datos básicos
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Pro, Business, Básico..."
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="pro, business, basico..."
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Precio *</Label>
                  <Input
                    id="price"
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS ($)</SelectItem>
                      <SelectItem value="USD">USD (US$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interval">Intervalo</Label>
                  <Select value={form.interval} onValueChange={(v) => setForm({ ...form, interval: v })}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Mensual</SelectItem>
                      <SelectItem value="year">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción breve del plan..."
                  rows={2}
                  className="bg-white resize-none"
                />
              </div>
            </div>

            {/* Límites y permisos */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--umpi-text)] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" style={{ color: "var(--umpi-gold)" }} />
                Límites y permisos
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="maxListings">Máx. publicaciones</Label>
                  <Input
                    id="maxListings"
                    type="number"
                    min={0}
                    value={form.maxListings}
                    onChange={(e) => setForm({ ...form, maxListings: Number(e.target.value) })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxFeatured">Máx. destacadas</Label>
                  <Input
                    id="maxFeatured"
                    type="number"
                    min={0}
                    value={form.maxFeatured}
                    onChange={(e) => setForm({ ...form, maxFeatured: Number(e.target.value) })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="multiUser">Usuarios incluidos</Label>
                  <Input
                    id="multiUser"
                    type="number"
                    min={1}
                    value={form.multiUser}
                    onChange={(e) => setForm({ ...form, multiUser: Number(e.target.value) })}
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="order">Orden de visualización</Label>
                  <Input
                    id="order"
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceType">Tipo de factura</Label>
                  <Select
                    value={form.invoiceType || "none"}
                    onValueChange={(v) => setForm({ ...form, invoiceType: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Sin factura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin factura</SelectItem>
                      <SelectItem value="A">Factura A</SelectItem>
                      <SelectItem value="B">Factura B</SelectItem>
                      <SelectItem value="C">Factura C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <ToggleRow
                  label="Insignia verificado"
                  checked={form.badgeVerified}
                  onChange={(v) => setForm({ ...form, badgeVerified: v })}
                />
                <ToggleRow
                  label="Acceso Top 10"
                  checked={form.top10Access}
                  onChange={(v) => setForm({ ...form, top10Access: v })}
                />
                <ToggleRow
                  label="Soporte prioritario"
                  checked={form.prioritySupport}
                  onChange={(v) => setForm({ ...form, prioritySupport: v })}
                />
                <ToggleRow
                  label="Reportes mensuales"
                  checked={form.monthlyReport}
                  onChange={(v) => setForm({ ...form, monthlyReport: v })}
                />
                <ToggleRow
                  label="Acceso a API"
                  checked={form.apiAccess}
                  onChange={(v) => setForm({ ...form, apiAccess: v })}
                />
                <ToggleRow
                  label="Plan activo"
                  checked={form.active}
                  onChange={(v) => setForm({ ...form, active: v })}
                />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-1.5">
              <Label htmlFor="features">Características (una por línea)</Label>
              <Textarea
                id="features"
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder={`Publicaciones ilimitadas\nSoporte 24/7\nPosicionamiento prioritario\n...`}
                rows={5}
                className="bg-white resize-none font-mono text-xs"
              />
              <p className="text-xs text-[var(--umpi-text3)]">
                Cada línea será una característica que se muestra en la tarjeta del plan.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ background: "var(--umpi-accent)", color: "white" }}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Guardando..."
                  : editing
                  ? "Guardar cambios"
                  : "Crear plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar el plan <strong>{deleteTarget?.name}</strong> ({deleteTarget?.slug}). Si tiene suscripciones activas, se desactivará en lugar de borrarse para preservar el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Procesando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FeatureRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--umpi-green)" }} />
      ) : (
        <X className="w-3.5 h-3.5 shrink-0 text-[var(--umpi-text3)]" />
      )}
      <span className={ok ? "text-[var(--umpi-text)]" : "text-[var(--umpi-text3)] line-through"}>
        {text}
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-[var(--umpi-surface)] border border-[var(--umpi-border)]">
      <span className="text-xs font-medium text-[var(--umpi-text)]">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
