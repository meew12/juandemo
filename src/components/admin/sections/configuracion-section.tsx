"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  RefreshCw,
  RotateCcw,
  Type,
  Layout,
  Phone,
  Mail,
  MessageSquare,
  Cookie,
  Megaphone,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { invalidateSiteConfig } from "@/hooks/use-site-config";

type ConfigGroup = Record<string, { key: string; label: string; value: string }[]>;

const SECTION_ICONS: Record<string, any> = {
  "Hero (Inicio)": Type,
  "Indicadores de confianza": Layout,
  "Sección CTA": Megaphone,
  Footer: Type,
  Newsletter: Mail,
  "Banner de cookies": Cookie,
  "Datos de contacto": Phone,
};

async function fetchConfig() {
  const res = await fetch("/api/admin/site-config");
  if (!res.ok) throw new Error("Error");
  return res.json();
}

export function ConfiguracionSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-site-config"],
    queryFn: fetchConfig,
  });

  // Patrón "overrides": solo guardamos los campos modificados localmente.
  // El valor mostrado se deriva: `{ ...data.raw, ...overrides }`.
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Estado derivado
  const draft = data?.raw ? { ...data.raw, ...overrides } : {};
  const dirty = Object.keys(overrides).length > 0;

  const updateValue = (key: string, value: string) => {
    setOverrides((o) => {
      // Si el valor vuelve al original, lo quitamos de overrides para que no cuente como "cambio"
      if (data?.raw && value === data.raw[key]) {
        const next = { ...o };
        delete next[key];
        return next;
      }
      return { ...o, [key]: value };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    onSuccess: (resp: any) => {
      toast.success(`${resp.updated} texto(s) actualizado(s)`);
      qc.invalidateQueries({ queryKey: ["admin-site-config"] });
      // Invalidar también la caché pública del frontend.
      // IMPORTANT: invalidateSiteConfig() limpia el module-level cache del hook
      // (sin esto, fetchConfig seguiría devolviendo el valor viejo incluso tras la
      // invalidación de React Query, porque el hook shortcut-ea con cachedConfig).
      invalidateSiteConfig();
      qc.invalidateQueries({ queryKey: ["site-config"] });
      setOverrides({});
    },
    onError: (e: any) => toast.error(e.message || "Error al guardar"),
  });

  const handleSave = () => {
    if (Object.keys(overrides).length === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }
    saveMutation.mutate(overrides);
  };

  const handleReset = () => {
    setOverrides({});
    toast.info("Cambios descartados");
  };

  const groups: ConfigGroup = data?.config || {};
  const groupEntries = Object.entries(groups);
  const changedCount = Object.keys(overrides).length;

  if (isLoading) {
    return (
      <div className="py-12 text-center text-[var(--umpi-text2)] text-sm">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Banner de estado */}
      <Card className="p-4 bg-white border-[var(--umpi-border)]">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="grid place-items-center rounded-lg shrink-0"
            style={{ width: 40, height: 40, background: "rgba(124, 58, 237, 0.12)", color: "var(--umpi-purple)" }}
          >
            <Type className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-semibold text-[var(--umpi-text)] text-sm">
              Editor de textos del sitio
            </h3>
            <p className="text-xs text-[var(--umpi-text2)]">
              Modificá los textos que ven los usuarios en el frontend. Los cambios se aplican en tiempo real.
            </p>
          </div>
          {dirty && (
            <Badge variant="outline" className="text-[11px] font-semibold bg-[var(--umpi-gold-soft)] text-[var(--umpi-gold)] border-[#ecdfb8]">
              {changedCount} cambio(s) sin guardar
            </Badge>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!dirty || saveMutation.isPending}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saveMutation.isPending}
              style={{ background: "var(--umpi-accent)", color: "white" }}
            >
              {saveMutation.isPending ? (
                <>Guardando...</>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Grupos de configuración */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groupEntries.map(([groupName, items]) => {
          const Icon = SECTION_ICONS[groupName] || Type;
          return (
            <Card key={groupName} className="p-5 bg-white border-[var(--umpi-border)]">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--umpi-border)]">
                <div
                  className="grid place-items-center rounded-md shrink-0"
                  style={{ width: 28, height: 28, background: "rgba(232, 76, 30, 0.1)", color: "var(--umpi-accent)" }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-[var(--umpi-text)] text-sm">{groupName}</h3>
                <span className="ml-auto text-xs text-[var(--umpi-text3)]">{items.length} campos</span>
              </div>
              <div className="space-y-3">
                {items.map((item) => {
                  const isLong = item.value.length > 60 || item.key.includes("subtitle") || item.key.includes("description") || item.key.includes("message") || item.key.includes("tagline");
                  const changed = draft[item.key] !== data?.raw?.[item.key];
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={item.key} className="text-xs font-medium text-[var(--umpi-text2)]">
                          {item.label}
                        </Label>
                        {changed && (
                          <Badge variant="outline" className="text-[9px] font-semibold bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] border-[#f5c5b3] py-0">
                            modificado
                          </Badge>
                        )}
                      </div>
                      {isLong ? (
                        <Textarea
                          id={item.key}
                          value={draft[item.key] || ""}
                          onChange={(e) => updateValue(item.key, e.target.value)}
                          rows={2}
                          className="bg-white resize-none text-sm"
                        />
                      ) : (
                        <Input
                          id={item.key}
                          value={draft[item.key] || ""}
                          onChange={(e) => updateValue(item.key, e.target.value)}
                          className="bg-white text-sm"
                        />
                      )}
                      <code className="text-[10px] text-[var(--umpi-text3)] block">
                        {item.key}
                      </code>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tip */}
      <Card className="p-4 bg-[var(--umpi-purple-soft)] border-[#d8ccf0]">
        <div className="flex items-start gap-3">
          <div
            className="grid place-items-center rounded-md shrink-0 mt-0.5"
            style={{ width: 24, height: 24, background: "var(--umpi-purple)", color: "white" }}
          >
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-[var(--umpi-purple)] mb-0.5">Tip</p>
            <p className="text-[var(--umpi-text2)] text-xs">
              Los cambios se guardan en la base de datos y se reflejan inmediatamente en el sitio público.
              Si vacías un campo, se usará el valor por defecto. Para volver al original, simplemente
              recargá esta página sin guardar.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
