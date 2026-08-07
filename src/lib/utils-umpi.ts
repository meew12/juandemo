// Utilidades compartidas UMPI

export function formatPrice(amount: number, currency: string = "ARS"): string {
  const symbol = currency === "USD" ? "US$" : "$";
  return `${symbol}${new Intl.NumberFormat("es-AR").format(amount)}`;
}

export function formatPriceWithUnit(
  amount: number,
  currency: string = "ARS",
  unit?: string
): string {
  const base = formatPrice(amount, currency);
  if (!unit) return base;
  const unitLabel =
    unit === "hora"
      ? "/ hora"
      : unit === "dia"
      ? "/ día"
      : unit === "mes"
      ? "/ mes"
      : unit === "unico"
      ? ""
      : `/${unit}`;
  return `${base}${unitLabel}`;
}

export function formatViews(views: number): string {
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K vistas`;
  return `${views} vistas`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

export function generateTxId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `TXN-${id}`;
}

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

export function timeAgo(date: Date | string | number): string {
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "number") {
    d = new Date(date);
  } else if (typeof date === "string") {
    // Handle both ISO strings ("2025-01-15T...") and epoch ms strings ("1785711010969")
    const trimmed = date.trim();
    if (/^\d+$/.test(trimmed)) {
      d = new Date(parseInt(trimmed, 10));
    } else {
      d = new Date(trimmed);
    }
  } else {
    d = new Date();
  }

  // If the date is invalid, return a fallback instead of "hace NaN año"
  if (isNaN(d.getTime())) return "hace un momento";

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 0) return "hace un momento";
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} día${days > 1 ? "s" : ""}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `hace ${weeks} semana${weeks > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months > 1 ? "es" : ""}`;
  const years = Math.floor(days / 365);
  return `hace ${years} año${years > 1 ? "s" : ""}`;
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export const ARGENTINA_PROVINCES = [
  "CABA",
  "Buenos Aires - GBA Norte",
  "Buenos Aires - GBA Sur",
  "Buenos Aires - GBA Oeste",
  "Buenos Aires - Interior",
  "Córdoba",
  "Santa Fe",
  "Mendoza",
  "Tucumán",
  "Entre Ríos",
  "Salta",
  "Misiones",
  "Chaco",
  "Corrientes",
  "Neuquén",
  "Río Negro",
  "San Juan",
  "San Luis",
  "La Plata",
  "Rosario",
  "Mar del Plata",
  "Remoto",
] as const;

export const SERVICE_CATEGORIES = [
  "Tecnología",
  "Diseño",
  "Marketing",
  "Plomería",
  "Electricidad",
  "Carpintería",
  "Educación",
  "Fotografía",
  "Contabilidad",
  "Música",
] as const;

export const CAR_BRANDS = [
  "Toyota",
  "Volkswagen",
  "Ford",
  "Renault",
  "Peugeot",
  "Honda",
  "Chevrolet",
  "Jeep",
  "Nissan",
  "Fiat",
] as const;

export const PROPERTY_TYPES = [
  "Departamento",
  "Casa",
  "PH",
  "Local comercial",
  "Terreno",
  "Oficina",
  "Quinta",
  "Studio",
] as const;
