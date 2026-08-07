"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Home as HomeIcon,
  Wrench,
  Car,
  Building2,
  ImagePlus,
  X,
  Loader2,
  UploadCloud,
  Star,
  Crown,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Info,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ARGENTINA_PROVINCES,
  CAR_BRANDS,
  PROPERTY_TYPES,
  SERVICE_CATEGORIES,
  formatPriceWithUnit,
  safeJsonParse,
} from "@/lib/utils-umpi";
import type { Category, Listing } from "@/lib/types";

// ────────────────────────────────────────────────────────────────────
// Types & constants
// ────────────────────────────────────────────────────────────────────

type CategoryType = "servicio" | "auto" | "propiedad";

interface AttrField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  placeholder?: string;
  options?: readonly string[];
  suffix?: string;
}

const TYPE_OPTIONS: {
  value: CategoryType;
  label: string;
  desc: string;
  icon: typeof Wrench;
}[] = [
  { value: "servicio", label: "Servicio", desc: "Ofrecé un servicio profesional", icon: Wrench },
  { value: "auto", label: "Auto", desc: "Vendé o alquilá un vehículo", icon: Car },
  { value: "propiedad", label: "Propiedad", desc: "Publicá un inmueble", icon: Building2 },
];

const ATTR_FIELDS: Record<CategoryType, AttrField[]> = {
  servicio: [
    { key: "experiencia", label: "Experiencia", type: "text", placeholder: "Ej: 5 años" },
    {
      key: "disponibilidad",
      label: "Disponibilidad",
      type: "select",
      options: ["Lunes a Viernes", "Lunes a Sábado", "Turnos rotativos", "Full time", "Fin de semana"],
    },
    {
      key: "modalidad",
      label: "Modalidad",
      type: "select",
      options: ["Presencial", "A distancia", "Híbrido"],
    },
  ],
  auto: [
    { key: "marca", label: "Marca", type: "select", options: CAR_BRANDS },
    { key: "modelo", label: "Modelo", type: "text", placeholder: "Ej: Corolla" },
    { key: "anio", label: "Año", type: "number", placeholder: "Ej: 2021" },
    { key: "km", label: "Kilómetros", type: "number", placeholder: "Ej: 45000", suffix: "km" },
    {
      key: "combustible",
      label: "Combustible",
      type: "select",
      options: ["Nafta", "Diésel", "GNC", "Híbrido", "Eléctrico"],
    },
    {
      key: "caja",
      label: "Caja",
      type: "select",
      options: ["Manual", "Automática", "Automática secuencial"],
    },
  ],
  propiedad: [
    { key: "tipo", label: "Tipo", type: "select", options: PROPERTY_TYPES },
    {
      key: "operacion",
      label: "Operación",
      type: "select",
      options: ["Venta", "Alquiler", "Alquiler temporario"],
    },
    { key: "superficie", label: "Superficie", type: "number", placeholder: "Ej: 80", suffix: "m²" },
    { key: "ambientes", label: "Ambientes", type: "number", placeholder: "Ej: 3" },
    { key: "banos", label: "Baños", type: "number", placeholder: "Ej: 2" },
  ],
};

const PRICE_UNITS = [
  { value: "unico", label: "Precio único" },
  { value: "hora", label: "Por hora" },
  { value: "dia", label: "Por día" },
  { value: "mes", label: "Por mes" },
];

const CURRENCIES = [
  { value: "ARS", label: "$ ARS" },
  { value: "USD", label: "US$ USD" },
];

const FEATURED_PRICE = 4990;
const MAX_IMAGES = 8;
const MAX_TITLE = 80;
const MAX_DESC = 2000;

const PLAN_LIMITS: Record<string, number> = {
  basico: 1,
  pro: 5,
  business: 9999,
};

interface ImageItem {
  url: string;
  name: string;
  isExisting?: boolean;
}

interface FormState {
  categoryType: CategoryType;
  categoryId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  priceUnit: string;
  location: string;
  province: string;
  attrs: Record<string, string>;
  featured: boolean;
}

const EMPTY_FORM: FormState = {
  categoryType: "servicio",
  categoryId: "",
  title: "",
  description: "",
  price: "",
  currency: "ARS",
  priceUnit: "hora",
  location: "",
  province: "",
  attrs: {},
  featured: false,
};

// ────────────────────────────────────────────────────────────────────
// Data fetchers
// ────────────────────────────────────────────────────────────────────

async function fetchCategories(type: string) {
  const res = await fetch(`/api/categories?type=${type}`);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.categories as Category[];
}

async function fetchListingForEdit(id: string) {
  const res = await fetch(`/api/listings/${id}`);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.listing as Listing;
}

async function fetchMyListingsCount() {
  const res = await fetch("/api/me/listings");
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return (data.listings as Listing[]).filter((l) => l.status === "active").length;
}

async function uploadImages(files: File[]): Promise<string[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al subir imágenes");
  return data.urls as string[];
}

// ────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────

export function PublicarPage({
  onNavigate,
  editId,
}: {
  onNavigate: (page: string, params?: any) => void;
  editId?: string;
}) {
  const { data: session, status } = useSession();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editId;

  // ── Categories (re-fetch on type change) ──
  const { data: categories } = useQuery({
    queryKey: ["categories", form.categoryType],
    queryFn: () => fetchCategories(form.categoryType),
    enabled: !!session?.user?.id,
  });

  // ── Plan limit check ──
  const { data: activeCount } = useQuery({
    queryKey: ["my-listings-count"],
    queryFn: fetchMyListingsCount,
    enabled: !!session?.user?.id && !isEditing,
  });

  // ── Load existing listing if editing ──
  const { data: editData, isLoading: loadingEdit } = useQuery({
    queryKey: ["listing-edit", editId],
    queryFn: () => fetchListingForEdit(editId!),
    enabled: !!editId && !!session?.user?.id,
  });

  // Reset form when entering create mode
  useEffect(() => {
    if (!editId) {
      setForm(EMPTY_FORM);
      setImages([]);
    }
  }, [editId]);

  // Populate form when edit data arrives
  useEffect(() => {
    if (!editData) return;
    const parsedAttrs = safeJsonParse<Record<string, string>>(editData.attrs, {});
    const parsedImgs = safeJsonParse<string[]>(editData.images, []);
    setForm({
      categoryType: (editData.categoryType as CategoryType) || "servicio",
      categoryId: editData.categoryId || "",
      title: editData.title || "",
      description: editData.description || "",
      price: String(editData.price ?? ""),
      currency: editData.currency || "ARS",
      priceUnit:
        editData.priceUnit ||
        (editData.categoryType === "servicio" ? "hora" : "unico"),
      location: editData.location || "",
      province: editData.province || "",
      attrs: parsedAttrs,
      featured: editData.featured || false,
    });
    setImages(
      parsedImgs.map((url: string, i: number) => ({
        url,
        name: `imagen-${i + 1}`,
        isExisting: true,
      }))
    );
  }, [editData]);

  // ── Reset priceUnit when type changes (servicio = hora default, others = unico) ──
  useEffect(() => {
    if (form.categoryType !== "servicio" && form.priceUnit !== "unico") {
      setForm((f) => ({ ...f, priceUnit: "unico" }));
    }
  }, [form.categoryType, form.priceUnit]);

  // ── Submit handler ──
  // The listing is created first; if the user checked "featured", the backend
  // returns pendingBoost=true and we redirect to MercadoPago checkout to pay
  // for the boost. The boost is only activated after MP confirms the payment.
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryType: form.categoryType,
        categoryId: form.categoryId || null,
        price: parseFloat(form.price),
        currency: form.currency,
        priceUnit:
          form.categoryType === "servicio" ? form.priceUnit : "unico",
        location: form.location.trim() || null,
        zone: form.province || null,
        province: form.province || null,
        images: images.map((i) => i.url),
        attrs: form.attrs,
        featured: form.featured,
      };

      if (isEditing && editId) {
        const res = await fetch(`/api/listings/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al guardar");
        return { listing: data.listing as Listing, pendingBoost: false, boostType: null, boostAmount: 0 };
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al publicar");
      return {
        listing: data.listing as Listing,
        pendingBoost: data.pendingBoost === true,
        boostType: data.boostType as "destacado" | "top" | "premium_destacado" | null,
        boostAmount: data.boostAmount as number,
      };
    },
    onSuccess: async (resp) => {
      const { listing, pendingBoost, boostType } = resp;

      // If the user requested a featured boost, redirect to MP checkout.
      // The listing is already created as active (just not featured yet).
      if (pendingBoost && boostType && !isEditing) {
        toast.success("¡Publicación creada! Redirigiendo a MercadoPago para pagar el destacado…");
        try {
          const mpRes = await fetch("/api/mercadopago/boost", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId: listing.id, boostType }),
          });
          const mpData = await mpRes.json();
          if (!mpRes.ok) {
            throw new Error(mpData.error || "No se pudo iniciar el pago del destacado");
          }
          // Redirect to MP checkout — the boost activates after payment
          window.location.href = mpData.init_point;
          return;
        } catch (err: any) {
          // Listing was created, but the boost payment failed to start.
          // Navigate to the listing and show an error.
          toast.error(
            err.message ||
              "La publicación se creó, pero no se pudo iniciar el pago del destacado. Podés pagar el destacado después desde tu perfil."
          );
          onNavigate("detail", { slug: listing.slug });
          return;
        }
      }

      toast.success(
        isEditing ? "Cambios guardados ✓" : "¡Publicación creada! 🎉"
      );
      onNavigate("detail", { slug: listing.slug });
    },
    onError: (err: any) => {
      toast.error(err.message || "Ocurrió un error");
    },
  });

  // ── Image handlers ──
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        toast.error(`Máximo ${MAX_IMAGES} imágenes`);
        return;
      }

      const valid = arr
        .filter((f) => ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(f.type))
        .filter((f) => f.size <= 10 * 1024 * 1024);

      const invalidCount = arr.length - valid.length;
      if (invalidCount > 0) {
        toast.warning(
          `${invalidCount} archivo(s) ignorado(s). Solo PNG, JPG o WebP hasta 10MB.`
        );
      }

      const toUpload = valid.slice(0, remaining);
      if (toUpload.length === 0) return;

      setUploading(true);
      try {
        const urls = await uploadImages(toUpload);
        setImages((prev) => [
          ...prev,
          ...urls.map((url, i) => ({ url, name: toUpload[i].name })),
        ]);
        toast.success(`${urls.length} imagen(es) subida(s) ✓`);
      } catch (err: any) {
        toast.error(err.message || "Error al subir imágenes");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [images.length]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Attr update ──
  const updateAttr = (key: string, value: string) => {
    setForm((f) => ({ ...f, attrs: { ...f.attrs, [key]: value } }));
  };

  // ── Derived state ──
  const userPlan = (session?.user as any)?.plan || "basico";
  const planLimit = PLAN_LIMITS[userPlan] ?? 1;
  const reachedLimit = !isEditing && typeof activeCount === "number" && activeCount >= planLimit;
  const canSubmit =
    form.title.trim().length >= 8 &&
    form.description.trim().length >= 20 &&
    form.price !== "" &&
    parseFloat(form.price) > 0 &&
    !submitMutation.isPending &&
    !uploading;

  // ── Loading state ──
  if (status === "loading" || (isEditing && loadingEdit)) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--umpi-accent)] mx-auto mb-3" />
          <p className="text-sm text-[var(--umpi-text2)]">
            {isEditing ? "Cargando publicación…" : "Cargando…"}
          </p>
        </div>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!session?.user?.id) {
    return <LoginPrompt onNavigate={onNavigate} />;
  }

  // ── Plan limit reached ──
  if (reachedLimit) {
    return (
      <PlanLimitPrompt
        plan={userPlan}
        activeCount={activeCount ?? 0}
        limit={planLimit}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList className="text-xs">
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="cursor-pointer text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)]"
            >
              <span onClick={() => onNavigate("home")}>
                <HomeIcon className="w-3.5 h-3.5" />
                Inicio
              </span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[var(--umpi-text)] font-medium">
              {isEditing ? "Editar aviso" : "Publicar aviso"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <header className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--umpi-text)] tracking-tight">
          {isEditing ? "Editar aviso" : "Publicar aviso"}
        </h1>
        <p className="text-sm text-[var(--umpi-text2)] mt-1.5 max-w-2xl">
          {isEditing
            ? "Modificá los detalles de tu publicación. Los cambios se reflejan inmediatamente."
            : "Creá un aviso claro, con fotos reales y precio justo para recibir más contactos."}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ─────────── MAIN FORM ─────────── */}
        <div className="space-y-5">
          {/* Card: Tipo de publicación */}
          <FormCard
            step={1}
            title="Tipo de publicación"
            hint="Elegí la categoría principal del aviso"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TYPE_OPTIONS.map((opt) => {
                const active = form.categoryType === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        categoryType: opt.value,
                        categoryId: "",
                        priceUnit: opt.value === "servicio" ? "hora" : "unico",
                        attrs: {},
                      }));
                    }}
                    className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                      active
                        ? "border-[var(--umpi-accent)] bg-[var(--umpi-accent-soft)] shadow-[0_0_0_3px_rgba(232,76,30,0.08)]"
                        : "border-[var(--umpi-border)] bg-[var(--umpi-surface)] hover:border-[var(--umpi-text3)]"
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg grid place-items-center mb-2"
                      style={{
                        background: active ? "var(--umpi-accent)" : "var(--umpi-surface2)",
                        color: active ? "#fff" : "var(--umpi-text2)",
                      }}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <p className="font-semibold text-sm text-[var(--umpi-text)]">{opt.label}</p>
                    <p className="text-xs text-[var(--umpi-text2)] mt-0.5 leading-snug">{opt.desc}</p>
                    {active && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--umpi-accent)] absolute top-3 right-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </FormCard>

          {/* Card: Información básica */}
          <FormCard
            step={2}
            title="Información básica"
            hint="Los campos marcados con * son obligatorios"
          >
            <div className="space-y-4">
              {/* Categoría */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--umpi-text2)]">
                  Categoría
                </Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                >
                  <SelectTrigger className="h-10 w-full bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                    <SelectValue placeholder="Elegí una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {!categories || categories.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[var(--umpi-text3)]">
                        {SERVICE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c.toLowerCase()}>
                            {c}
                          </SelectItem>
                        ))}
                      </div>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title" className="text-xs font-medium text-[var(--umpi-text2)]">
                    Título *
                  </Label>
                  <span
                    className={`text-[10px] tabular-nums ${
                      form.title.length > MAX_TITLE - 10
                        ? "text-[var(--umpi-accent)] font-medium"
                        : "text-[var(--umpi-text3)]"
                    }`}
                  >
                    {form.title.length} / {MAX_TITLE}
                  </span>
                </div>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value.slice(0, MAX_TITLE) }))
                  }
                  placeholder="Ej: Plomero matriculado - urgencias 24 hs"
                  maxLength={MAX_TITLE}
                  className="h-10 bg-[var(--umpi-surface)] border-[var(--umpi-border)]"
                />
                <p className="text-[11px] text-[var(--umpi-text3)]">
                  Escribí un título claro de hasta {MAX_TITLE} caracteres.
                </p>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-xs font-medium text-[var(--umpi-text2)]">
                    Descripción *
                  </Label>
                  <span
                    className={`text-[10px] tabular-nums ${
                      form.description.length > MAX_DESC - 100
                        ? "text-[var(--umpi-accent)] font-medium"
                        : "text-[var(--umpi-text3)]"
                    }`}
                  >
                    {form.description.length} / {MAX_DESC}
                  </span>
                </div>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value.slice(0, MAX_DESC),
                    }))
                  }
                  placeholder="Describí tu oferta, características, condiciones, zonas de cobertura, etc."
                  maxLength={MAX_DESC}
                  className="bg-[var(--umpi-surface)] border-[var(--umpi-border)] min-h-[140px] resize-y"
                />
              </div>
            </div>
          </FormCard>

          {/* Card: Precio */}
          <FormCard step={3} title="Precio" hint="Definí el valor y la moneda">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="price" className="text-xs font-medium text-[var(--umpi-text2)]">
                  Precio *
                </Label>
                <Input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  className="h-10 bg-[var(--umpi-surface)] border-[var(--umpi-border)] tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--umpi-text2)]">Moneda</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger className="h-10 w-full bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--umpi-text2)]">Unidad</Label>
                {form.categoryType === "servicio" ? (
                  <Select
                    value={form.priceUnit}
                    onValueChange={(v) => setForm((f) => ({ ...f, priceUnit: v }))}
                  >
                    <SelectTrigger className="h-10 w-full bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 px-3 grid items-center rounded-md border border-[var(--umpi-border)] bg-[var(--umpi-surface2)] text-sm text-[var(--umpi-text2)]">
                    Precio único
                  </div>
                )}
              </div>
            </div>
          </FormCard>

          {/* Card: Ubicación */}
          <FormCard step={4} title="Ubicación" hint="Donde se ofrece o se encuentra">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs font-medium text-[var(--umpi-text2)]">
                  Zona / Barrio
                </Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Ej: Palermo, Caballito, Centro"
                  className="h-10 bg-[var(--umpi-surface)] border-[var(--umpi-border)]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--umpi-text2)]">Provincia</Label>
                <Select
                  value={form.province}
                  onValueChange={(v) => setForm((f) => ({ ...f, province: v }))}
                >
                  <SelectTrigger className="h-10 w-full bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                    <SelectValue placeholder="Elegí una provincia" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {ARGENTINA_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormCard>

          {/* Card: Imágenes */}
          <FormCard
            step={5}
            title="Imágenes"
            hint={`Hasta ${MAX_IMAGES} fotos · PNG, JPG o WebP · máx 10MB c/u`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-[var(--umpi-accent)] bg-[var(--umpi-accent-soft)]"
                  : "border-[var(--umpi-border)] bg-[var(--umpi-surface2)] hover:border-[var(--umpi-text3)]"
              }`}
            >
              <div className="flex flex-col items-center gap-2 py-2">
                <div
                  className="w-11 h-11 rounded-full grid place-items-center"
                  style={{
                    background: "var(--umpi-accent-soft)",
                    color: "var(--umpi-accent)",
                  }}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>
                <p className="text-sm font-medium text-[var(--umpi-text)]">
                  {uploading
                    ? "Subiendo imágenes…"
                    : "Arrastrá imágenes aquí o hacé clic para subir"}
                </p>
                <p className="text-xs text-[var(--umpi-text3)]">
                  La primera imagen será la portada del aviso
                </p>
              </div>
            </div>

            {/* Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--umpi-border)] bg-[var(--umpi-surface2)]"
                  >
                    <img
                      src={img.url}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <div className="absolute top-1.5 left-1.5">
                        <Badge className="bg-[var(--umpi-accent)] text-white text-[9px] px-1.5 py-0 h-5">
                          Portada
                        </Badge>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      aria-label="Quitar imagen"
                      className="absolute top-1.5 right-1.5 w-6 h-6 grid place-items-center rounded-full bg-black/70 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--umpi-accent)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {img.isExisting && (
                      <div className="absolute bottom-1.5 left-1.5">
                        <Badge className="bg-black/60 backdrop-blur text-white text-[9px] px-1.5 py-0 h-5">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Guardada
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-[var(--umpi-border)] grid place-items-center text-[var(--umpi-text3)] hover:border-[var(--umpi-accent)] hover:text-[var(--umpi-accent)] transition-all"
                  >
                    <ImagePlus className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--umpi-text3)]">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {images.length} / {MAX_IMAGES} imágenes · Usá fotos reales y bien iluminadas
              </span>
            </div>
          </FormCard>

          {/* Card: Atributos dinámicos */}
          <FormCard
            step={6}
            title="Detalles específicos"
            hint={`Atributos para ${form.categoryType}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ATTR_FIELDS[form.categoryType].map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs font-medium text-[var(--umpi-text2)]">
                    {field.label}
                  </Label>
                  {field.type === "select" && field.options ? (
                    <Select
                      value={form.attrs[field.key] || ""}
                      onValueChange={(v) => updateAttr(field.key, v)}
                    >
                      <SelectTrigger className="h-10 w-full bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
                        <SelectValue placeholder="Elegí…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="relative">
                      <Input
                        type={field.type === "number" ? "number" : "text"}
                        inputMode={field.type === "number" ? "numeric" : undefined}
                        value={form.attrs[field.key] || ""}
                        onChange={(e) => updateAttr(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        min={0}
                        className="h-10 bg-[var(--umpi-surface)] border-[var(--umpi-border)] pr-12 tabular-nums"
                      />
                      {field.suffix && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--umpi-text3)] pointer-events-none">
                          {field.suffix}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </FormCard>

          {/* Card: Featured add-on */}
          <FormCard step={7} title="Destacar publicación" hint="Aumentá la visibilidad">
            <label
              className={`relative block cursor-pointer rounded-xl border-2 p-4 transition-all ${
                form.featured
                  ? "border-[var(--umpi-gold)] bg-[var(--umpi-gold-soft)] shadow-[0_0_0_3px_rgba(196,154,42,0.15)]"
                  : "border-[var(--umpi-border)] bg-[var(--umpi-surface)] hover:border-[var(--umpi-text3)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={form.featured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v === true }))}
                  className="mt-0.5 data-[state=checked]:bg-[var(--umpi-gold)] data-[state=checked]:border-[var(--umpi-gold)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Star
                      className={`w-4 h-4 ${
                        form.featured
                          ? "fill-[var(--umpi-gold)] text-[var(--umpi-gold)]"
                          : "text-[var(--umpi-text3)]"
                      }`}
                    />
                    <span className="font-semibold text-sm text-[var(--umpi-text)]">
                      Publicación Destacada
                    </span>
                    <Badge
                      className="text-[10px] h-5"
                      style={{
                        background: "var(--umpi-gold-soft)",
                        color: "var(--umpi-gold)",
                      }}
                    >
                      +30 días
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--umpi-text2)] mb-2 leading-relaxed">
                    Aparecé primero en los resultados por 30 días. Tu aviso tendrá un borde dorado,
                    insignia de destacado y prioridad en las búsquedas.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl text-[var(--umpi-text)]">
                      ${FEATURED_PRICE.toLocaleString("es-AR")}
                    </span>
                    <span className="text-xs text-[var(--umpi-text3)] line-through">
                      ${(FEATURED_PRICE * 1.4).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs font-medium text-[var(--umpi-green)]">
                      Ahorrá 30%
                    </span>
                  </div>
                  {form.featured && (
                    <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-[var(--umpi-text2)] bg-[var(--umpi-surface2)] rounded-md p-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--umpi-gold)]" />
                      <span>
                        Primero se publica tu aviso gratis. Después vas a ser redirigido a
                        <strong className="text-[var(--umpi-text)]"> MercadoPago</strong> para pagar
                        el destacado. El destacado se activa solo cuando se confirma el pago.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </label>
          </FormCard>

          {/* Submit (mobile) */}
          <div className="lg:hidden sticky bottom-3 z-10">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!canSubmit}
              className="w-full h-12 bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white rounded-full gap-2 shadow-[0_8px_24px_rgba(232,76,30,0.3)]"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isEditing ? "Guardar cambios" : "Publicar aviso"}
            </Button>
          </div>
        </div>

        {/* ─────────── STICKY SIDEBAR PREVIEW ─────────── */}
        <aside className="lg:sticky lg:top-[calc(var(--nav-h)+24px)] lg:self-start">
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl overflow-hidden">
            {/* Preview image */}
            <div className="aspect-[4/3] bg-[var(--umpi-surface2)] relative">
              {images[0]?.url ? (
                <img
                  src={images[0].url}
                  alt="Portada"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <ImagePlus className="w-8 h-8 text-[var(--umpi-text3)] mx-auto mb-1.5" />
                    <p className="text-xs text-[var(--umpi-text3)]">Sin imagen</p>
                  </div>
                </div>
              )}
              {form.featured && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-[var(--umpi-gold)] text-white text-[10px] gap-1 px-2 py-0.5 h-6">
                    <Star className="w-3 h-3 fill-current" />
                    Destacado
                  </Badge>
                </div>
              )}
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2">
                  <Badge className="bg-black/70 backdrop-blur text-white text-[10px] gap-1 h-6">
                    <ImagePlus className="w-3 h-3" />
                    {images.length}
                  </Badge>
                </div>
              )}
            </div>

            {/* Preview body */}
            <div className="p-4 space-y-3">
              <div>
                <Badge
                  variant="outline"
                  className="text-[10px] capitalize mb-2 border-[var(--umpi-border)] text-[var(--umpi-text2)]"
                >
                  {form.categoryType}
                </Badge>
                <h3 className="font-display text-lg text-[var(--umpi-text)] leading-tight line-clamp-2 min-h-[1.8em]">
                  {form.title || "Tu título aparecerá aquí"}
                </h3>
              </div>

              <p className="font-display text-2xl text-[var(--umpi-text)] tabular-nums">
                {form.price
                  ? formatPriceWithUnit(
                      parseFloat(form.price) || 0,
                      form.currency,
                      form.categoryType === "servicio" ? form.priceUnit : "unico"
                    )
                  : "$ —"}
              </p>

              {form.location || form.province ? (
                <p className="text-xs text-[var(--umpi-text2)] flex items-center gap-1">
                  <span className="w-3 h-3 inline-block rounded-full bg-[var(--umpi-accent)] opacity-60" />
                  {[form.location, form.province].filter(Boolean).join(", ") || "Sin ubicación"}
                </p>
              ) : null}

              {/* Summary */}
              <div className="border-t border-[var(--umpi-border)] pt-3 space-y-2 text-xs">
                <Row label="Tipo" value={TYPE_OPTIONS.find((t) => t.value === form.categoryType)?.label || "—"} />
                <Row
                  label="Imágenes"
                  value={`${images.length} / ${MAX_IMAGES}`}
                  ok={images.length > 0}
                />
                <Row
                  label="Destacado"
                  value={form.featured ? `Sí (+$${FEATURED_PRICE.toLocaleString("es-AR")})` : "No"}
                  ok={form.featured}
                />
              </div>

              {/* Submit (desktop) */}
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit}
                className="w-full h-11 bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white rounded-full gap-2 mt-1"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isEditing ? "Guardar cambios" : "Publicar aviso"}
              </Button>

              {isEditing && (
                <Button
                  variant="outline"
                  onClick={() => onNavigate("perfil")}
                  className="w-full h-9 border-[var(--umpi-border)] text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)]"
                >
                  Cancelar
                </Button>
              )}

              {/* Trust badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--umpi-text3)] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--umpi-green)] shrink-0" />
                <span>
                  Tu aviso será revisado por nuestro equipo antes de publicarse.
                </span>
              </div>
            </div>
          </div>

          {/* Tip card */}
          <div className="mt-4 bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <div
                className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
                style={{
                  background: "var(--umpi-gold-soft)",
                  color: "var(--umpi-gold)",
                }}
              >
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--umpi-text)] mb-0.5">
                  Consejo UMPI
                </p>
                <p className="text-xs text-[var(--umpi-text2)] leading-relaxed">
                  Los avisos con foto, descripción detallada y precio competitivo reciben
                  <strong className="text-[var(--umpi-text)]"> 5x más contactos</strong>.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

function FormCard({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-[var(--umpi-surface)] border-[var(--umpi-border)] rounded-xl p-5 shadow-none">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0"
          style={{
            background: "var(--umpi-accent-soft)",
            color: "var(--umpi-accent)",
          }}
        >
          {step}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-base text-[var(--umpi-text)] leading-tight">{title}</h2>
          {hint && <p className="text-xs text-[var(--umpi-text3)] mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--umpi-text3)]">{label}</span>
      <span
        className={`font-medium ${
          ok ? "text-[var(--umpi-green)]" : "text-[var(--umpi-text)]"
        }`}
      >
        {ok && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
        {value}
      </span>
    </div>
  );
}

function LoginPrompt({
  onNavigate,
}: {
  onNavigate: (page: string, params?: any) => void;
}) {
  return (
    <div className="max-w-[560px] mx-auto px-4 py-16 text-center animate-fade-in">
      <div
        className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-5"
        style={{
          background: "var(--umpi-accent-soft)",
          color: "var(--umpi-accent)",
        }}
      >
        <Lock className="w-7 h-7" />
      </div>
      <h2 className="font-display text-3xl text-[var(--umpi-text)] mb-2">
        Iniciá sesión para publicar
      </h2>
      <p className="text-sm text-[var(--umpi-text2)] mb-6 max-w-md mx-auto">
        Necesitás una cuenta UMPI para crear publicaciones, contactar vendedores y
        gestionar tus avisos. Es gratis y toma menos de un minuto.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set("auth", "login");
            window.history.pushState({}, "", url.toString());
            onNavigate("home");
            setTimeout(() => window.location.reload(), 50);
          }}
          className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white rounded-full h-11 px-6 gap-2"
        >
          Iniciar sesión
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("home")}
          className="border-[var(--umpi-border)] text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)] rounded-full h-11 px-6"
        >
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}

function PlanLimitPrompt({
  plan,
  activeCount,
  limit,
  onNavigate,
}: {
  plan: string;
  activeCount: number;
  limit: number;
  onNavigate: (page: string, params?: any) => void;
}) {
  const planName = { basico: "Básico", pro: "Pro", business: "Business" }[plan] || plan;
  return (
    <div className="max-w-[640px] mx-auto px-4 py-16 text-center animate-fade-in">
      <div
        className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-5"
        style={{
          background: "var(--umpi-purple-soft)",
          color: "var(--umpi-purple)",
        }}
      >
        <Crown className="w-7 h-7" />
      </div>
      <Badge
        className="mb-3"
        style={{
          background: "var(--umpi-purple-soft)",
          color: "var(--umpi-purple)",
        }}
      >
        Plan {planName}
      </Badge>
      <h2 className="font-display text-3xl text-[var(--umpi-text)] mb-2">
        Alcanzaste el límite de publicaciones
      </h2>
      <p className="text-sm text-[var(--umpi-text2)] mb-6 max-w-md mx-auto">
        Tu plan <strong className="text-[var(--umpi-text)]">{planName}</strong> permite hasta{" "}
        <strong className="text-[var(--umpi-text)]">{limit}</strong> publicación(es) activa(s) y
        tenés <strong className="text-[var(--umpi-text)]">{activeCount}</strong> activa(s). Mejorá
        tu plan para seguir publicando o eliminá una publicación existente.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          onClick={() => onNavigate("suscripciones")}
          className="bg-[var(--umpi-purple)] hover:bg-[var(--umpi-purple)]/90 text-white rounded-full h-11 px-6 gap-2"
        >
          <Crown className="w-4 h-4" />
          Mejorar plan
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("perfil")}
          className="border-[var(--umpi-border)] text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)] rounded-full h-11 px-6"
        >
          Gestionar publicaciones
        </Button>
      </div>
    </div>
  );
}
