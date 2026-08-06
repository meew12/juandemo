"use client";

import { useState, useMemo, useRef, useCallback, Fragment, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SlidersHorizontal,
  Grid2x2,
  List,
  X,
  ChevronRight,
  Home as HomeIcon,
  Star,
  BadgeCheck,
  Image as ImageIcon,
  Bookmark,
  Flame,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Clock,
  MapPin,
  SearchX,
  Loader2,
  ChevronsDown,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ListingCard } from "@/components/listing-card";
import { QuickViewModal } from "@/components/quick-view-modal";
import { MarketplaceGridSkeleton } from "@/components/skeletons";
import { SavedSearchesDropdown } from "@/components/saved-searches-dropdown";
import {
  addSavedSearch,
  isSearchSaved,
  type SavedSearch,
  type SavedSearchType,
} from "@/lib/saved-searches-store";
import { toast } from "sonner";
import type { Listing, Category } from "@/lib/types";

const MARKETPLACE_CONFIG: Record<
  string,
  {
    title: string;
    type: string;
    breadcrumb: string;
    totalLabel: string;
    zoneLabel: string;
    zones: string[];
  }
> = {
  servicios: {
    title: "Servicios profesionales",
    type: "servicio",
    breadcrumb: "Servicios",
    totalLabel: "resultados",
    zoneLabel: "Zona",
    zones: ["CABA", "GBA Norte", "GBA Sur", "GBA Oeste", "Córdoba", "Rosario", "Remoto"],
  },
  autos: {
    title: "Autos y vehículos",
    type: "auto",
    breadcrumb: "Autos",
    totalLabel: "vehículos",
    zoneLabel: "Ubicación",
    zones: ["CABA", "GBA Norte", "GBA Sur", "GBA Oeste", "Córdoba", "Rosario", "Mendoza"],
  },
  propiedades: {
    title: "Propiedades e inmuebles",
    type: "propiedad",
    breadcrumb: "Propiedades",
    totalLabel: "inmuebles",
    zoneLabel: "Ubicación",
    zones: ["CABA", "GBA Norte", "GBA Sur", "GBA Oeste", "Córdoba", "Rosario", "Mendoza"],
  },
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Más relevantes" },
  { value: "price_asc", label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "rating", label: "Mejor calificados" },
  { value: "newest", label: "Más recientes" },
  { value: "views", label: "Más vistos" },
];

// Slider range constants — kept here so we can reuse them across the price /
// year / km sliders and the formatted "Desde X — Hasta Y" labels.
// Price range is dynamic per category — servicios (services) cap at $1M ARS,
// autos (vehicles) at $50M, propiedades (real estate) at $100M. Steps scale
// accordingly so the slider thumb snaps to sensible increments.
const PRICE_RANGES: Record<string, { min: number; max: number; step: number }> = {
  servicios: { min: 1_000, max: 500_000, step: 1_000 },
  autos: { min: 500_000, max: 50_000_000, step: 50_000 },
  propiedades: { min: 10_000, max: 500_000_000, step: 100_000 },
};
const YEAR_RANGE = { min: 1990, max: 2026, step: 1 };
const KM_RANGE = { min: 0, max: 300_000, step: 5_000 };

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("es-AR");

async function fetchListings(params: URLSearchParams) {
  const res = await fetch(`/api/listings?${params.toString()}`);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data as { listings: Listing[]; total: number };
}

async function fetchCategories(type: string) {
  const res = await fetch(`/api/categories?type=${type}`);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.categories as Category[];
}

// ── Quick filter chips ────────────────────────────────────────────────────
// One-tap shortcuts above the grid. Each chip maps to a sort value, a filter
// toggle, a filter value, a multi-key filter change, or is purely visual
// (with a tooltip explaining what's coming soon). Defined per `pageKey` so
// the servicios / autos / propiedades pages show relevant shortcuts.
type FiltersState = {
  category: string;
  minPrice: string;
  maxPrice: string;
  zone: string;
  minRating: string;
  verifiedOnly: boolean;
  withPhoto: boolean;
  featuredOnly: boolean;
  minYear: string;
  maxYear: string;
  minKm: string;
  maxKm: string;
  rooms: string;
  operation: string;
};

type QuickChipAction =
  | { type: "sort"; value: string }
  | { type: "toggle"; key: "verifiedOnly" | "withPhoto" | "featuredOnly" }
  | {
      type: "value";
      key:
        | "zone"
        | "rooms"
        | "operation"
        | "minYear"
        | "maxYear"
        | "minKm"
        | "maxKm"
        | "minPrice"
        | "maxPrice";
      value: string;
    }
  | { type: "multi"; changes: Partial<FiltersState> }
  | { type: "visual" };

type QuickChip = {
  id: string;
  label: string;
  icon: LucideIcon;
  action: QuickChipAction;
  isActive: (state: { sort: string; filters: FiltersState }) => boolean;
  tooltip?: string;
};

const QUICK_FILTERS: Record<"servicios" | "autos" | "propiedades", QuickChip[]> = {
  servicios: [
    {
      id: "popular",
      label: "Popular ahora",
      icon: Flame,
      action: { type: "sort", value: "relevance" },
      isActive: (s) => s.sort === "relevance",
    },
    {
      id: "menor-precio",
      label: "Menor precio",
      icon: ArrowUpNarrowWide,
      action: { type: "sort", value: "price_asc" },
      isActive: (s) => s.sort === "price_asc",
    },
    {
      id: "mayor-precio",
      label: "Mayor precio",
      icon: ArrowDownWideNarrow,
      action: { type: "sort", value: "price_desc" },
      isActive: (s) => s.sort === "price_desc",
    },
    {
      id: "mejor-val",
      label: "Mejor valorados",
      icon: Star,
      action: { type: "sort", value: "rating" },
      isActive: (s) => s.sort === "rating",
    },
    {
      id: "recientes",
      label: "Recientes",
      icon: Clock,
      action: { type: "sort", value: "newest" },
      isActive: (s) => s.sort === "newest",
    },
    {
      id: "verificados",
      label: "Verificados",
      icon: BadgeCheck,
      action: { type: "toggle", key: "verifiedOnly" },
      isActive: (s) => s.filters.verifiedOnly,
    },
    {
      id: "caba",
      label: "CABA",
      icon: MapPin,
      action: { type: "value", key: "zone", value: "CABA" },
      isActive: (s) => s.filters.zone === "CABA",
    },
    {
      id: "respuesta",
      label: "Respuesta rápida",
      icon: Clock,
      action: { type: "visual" },
      isActive: () => false,
      tooltip: "Vendedores que responden en menos de 1 hora — próximamente",
    },
  ],
  autos: [
    {
      id: "0km",
      label: "0km",
      icon: Flame,
      action: { type: "multi", changes: { minKm: "", maxKm: "0" } },
      isActive: (s) => s.filters.minKm === "" && s.filters.maxKm === "0",
      tooltip: "Vehículos 0 kilómetros",
    },
    {
      id: "usado",
      label: "Usado",
      icon: Clock,
      action: { type: "visual" },
      isActive: () => false,
      tooltip: "Vehículos con uso — filtro por kilómetros próximamente",
    },
    {
      id: "nafta",
      label: "Nafta",
      icon: Flame,
      action: { type: "visual" },
      isActive: () => false,
      tooltip: "Solo a nafta — filtro próximamente",
    },
    {
      id: "diesel",
      label: "Diesel",
      icon: Flame,
      action: { type: "visual" },
      isActive: () => false,
      tooltip: "Solo diesel — filtro próximamente",
    },
    {
      id: "2020plus",
      label: "2020+",
      icon: ArrowUpNarrowWide,
      action: { type: "value", key: "minYear", value: "2020" },
      isActive: (s) => s.filters.minYear === "2020",
    },
    {
      id: "caba",
      label: "CABA",
      icon: MapPin,
      action: { type: "value", key: "zone", value: "CABA" },
      isActive: (s) => s.filters.zone === "CABA",
    },
  ],
  propiedades: [
    {
      id: "venta",
      label: "Venta",
      icon: ArrowUpNarrowWide,
      action: { type: "value", key: "operation", value: "Venta" },
      isActive: (s) => s.filters.operation === "Venta",
    },
    {
      id: "alquiler",
      label: "Alquiler",
      icon: ArrowDownWideNarrow,
      action: { type: "value", key: "operation", value: "Alquiler" },
      isActive: (s) => s.filters.operation === "Alquiler",
    },
    {
      id: "1dorm",
      label: "1 dorm.",
      icon: HomeIcon,
      action: { type: "value", key: "rooms", value: "1" },
      isActive: (s) => s.filters.rooms === "1",
    },
    {
      id: "2dorm",
      label: "2 dorms.",
      icon: HomeIcon,
      action: { type: "value", key: "rooms", value: "2" },
      isActive: (s) => s.filters.rooms === "2",
    },
    {
      id: "3dorm",
      label: "3+ dorms.",
      icon: HomeIcon,
      action: { type: "value", key: "rooms", value: "4+" },
      isActive: (s) => s.filters.rooms === "4+",
    },
    {
      id: "caba",
      label: "CABA",
      icon: MapPin,
      action: { type: "value", key: "zone", value: "CABA" },
      isActive: (s) => s.filters.zone === "CABA",
    },
    {
      id: "gba",
      label: "GBA",
      icon: MapPin,
      action: { type: "visual" },
      isActive: () => false,
      tooltip: "Gran Buenos Aires — filtro por zona específica próximamente",
    },
  ],
};

// ── Active filter chip (removable) ───────────────────────────────────────
// Shared sub-component used in the active-chips row above the grid. Uses
// accent-soft bg + accent text + border for prominence, with a real X
// button (proper aria-label + accessible hit area) to remove the filter.
// Declared at module scope so it isn't recreated on each render.
function ActiveChip({
  label,
  icon: Icon,
  onRemove,
}: {
  label: string;
  icon?: LucideIcon;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] border border-[var(--umpi-accent)]/20 rounded-full px-3 py-1 text-xs font-medium">
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro ${label}`}
        className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-[var(--umpi-accent)]/15 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export function MarketplacePage({
  pageKey,
  onNavigate,
  initialQuery,
}: {
  pageKey: "servicios" | "autos" | "propiedades";
  onNavigate: (page: string, params?: any) => void;
  initialQuery?: string;
}) {
  const config = MARKETPLACE_CONFIG[pageKey];
  const quickChips = QUICK_FILTERS[pageKey];
  // Pick the price slider range for this category. Falls back to servicios
  // defensively (pageKey is already typed as a union of the three keys, so
  // the fallback never actually triggers at runtime).
  const PRICE_RANGE = PRICE_RANGES[pageKey] || PRICE_RANGES.servicios;

  const [filters, setFilters] = useState<FiltersState>({
    category: "all",
    minPrice: "",
    maxPrice: "",
    zone: "all",
    minRating: "0",
    verifiedOnly: false,
    withPhoto: false,
    featuredOnly: false,
    // Vehicle-specific (only relevant for `autos`)
    minYear: "",
    maxYear: "",
    minKm: "",
    maxKm: "",
    // Property-specific (only relevant for `propiedades`)
    rooms: "all",
    operation: "all",
  });
  const [sort, setSort] = useState("relevance");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState(initialQuery || "");

  const hasActiveSearchOrFilters = !!(
    search ||
    filters.category !== "all" ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.zone !== "all" ||
    filters.minRating !== "0" ||
    filters.verifiedOnly ||
    filters.withPhoto ||
    filters.featuredOnly ||
    filters.minYear ||
    filters.maxYear ||
    filters.minKm ||
    filters.maxKm ||
    filters.rooms !== "all" ||
    filters.operation !== "all"
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [quickViewListing, setQuickViewListing] = useState<Listing | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  // Infinite scroll: extraListings accumulates pages loaded via "Cargar más".
  // Cleared whenever filters/sort/search/page change so the user starts fresh.
  const [extraListings, setExtraListings] = useState<Listing[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 8;

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", config.type);
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    if (filters.zone !== "all") params.set("zone", filters.zone);
    if (filters.minRating !== "0") params.set("minRating", filters.minRating);
    if (filters.verifiedOnly) params.set("verifiedOnly", "true");
    if (filters.withPhoto) params.set("withPhoto", "true");
    if (filters.featuredOnly) params.set("featuredOnly", "true");
    // Vehicle-specific — only sent when explicitly set
    if (filters.minYear) params.set("minYear", filters.minYear);
    if (filters.maxYear) params.set("maxYear", filters.maxYear);
    if (filters.minKm) params.set("minKm", filters.minKm);
    if (filters.maxKm) params.set("maxKm", filters.maxKm);
    // Property-specific — only sent when explicitly set (not "all")
    if (filters.rooms !== "all") params.set("rooms", filters.rooms);
    if (filters.operation !== "all") params.set("operation", filters.operation);
    if (search) params.set("q", search);
    params.set("sort", sort);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));
    return params;
  }, [config.type, filters, search, sort, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", queryParams.toString()],
    queryFn: () => fetchListings(queryParams),
    placeholderData: (prev) => prev,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", config.type],
    queryFn: () => fetchCategories(config.type),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  // Note: `totalPages` and `page` are retained for query param computation
  // (offset = (page-1) * PAGE_SIZE). Pagination UI was replaced by infinite
  // scroll "Cargar más" button + IntersectionObserver sentinel above.

  // Reset accumulated "load more" listings whenever the query changes
  // (filters / sort / search / page). This ensures the user starts fresh
  // from the current page's first batch when they refine their search.
  useEffect(() => {
    setExtraListings([]);
  }, [queryParams]);

  // Clamp price filters to the new category's range when pageKey changes.
  // e.g. switching from propiedades (max $100M) to servicios (max $1M)
  // would otherwise leave a stale maxPrice of $50M that exceeds the new
  // slider max. We clear the bound instead of clamping the value so the
  // user is not silently opted into a hidden filter.
  useEffect(() => {
    if (filters.minPrice && Number(filters.minPrice) > PRICE_RANGE.max) {
      updateFilters({ minPrice: "" });
    }
    if (filters.maxPrice && Number(filters.maxPrice) > PRICE_RANGE.max) {
      updateFilters({ maxPrice: "" });
    }
    // Intentionally only re-runs on pageKey change. We deliberately don't add
    // `filters.minPrice` / `filters.maxPrice` / `PRICE_RANGE.max` / `updateFilters`
    // to the deps array — we only want to clamp stale values when the category
    // switches, not re-run every time the user types into the price inputs.
  }, [pageKey]);

  // Combined listings to render: base page + accumulated "load more" pages.
  const allListings = useMemo(() => {
    const base = data?.listings ?? [];
    return extraListings.length > 0 ? base.concat(extraListings) : base;
  }, [data?.listings, extraListings]);

  // ── Client-side filtering ────────────────────────────────────────────────
  // Applies additional client-side filters on top of the server-side results.
  // This ensures that already-fetched listings are correctly filtered even if
  // the server-side filtering is not available or the results are cached.
  const filtered = useMemo(() => {
    let result = allListings;

    // Price range filter
    if (filters.minPrice) {
      const minP = Number(filters.minPrice);
      result = result.filter((l) => l.price >= minP);
    }
    if (filters.maxPrice) {
      const maxP = Number(filters.maxPrice);
      result = result.filter((l) => l.price <= maxP);
    }

    // Rating filter
    if (filters.minRating !== "0") {
      const minR = Number(filters.minRating);
      result = result.filter((l) => l.rating >= minR);
    }

    // Verified only filter
    if (filters.verifiedOnly) {
      result = result.filter((l) => l.seller?.verified === true);
    }

    return result;
  }, [allListings, filters.minPrice, filters.maxPrice, filters.minRating, filters.verifiedOnly]);

  const totalLoaded = filtered.length;
  const totalAvailable = data?.total ?? 0;
  const hasMoreToLoad = totalLoaded < totalAvailable && !isLoading;

  // Fetch the next batch and append to extraListings.
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreToLoad) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams(queryParams);
      // Offset = number of listings already shown (base page + accumulated).
      params.set("offset", String(totalLoaded));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      const next: Listing[] = json.listings || [];
      if (next.length > 0) {
        setExtraListings((prev) => prev.concat(next));
      }
    } catch {
      // Silent fail — the user can retry by clicking again.
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreToLoad, queryParams, totalLoaded]);

  // IntersectionObserver auto-loads more when the user scrolls near the bottom.
  // We use a small rootMargin so it triggers just before the sentinel is
  // visible, giving a smooth infinite-scroll feel without hiding the manual
  // "Cargar más" button before the user sees it.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMoreToLoad || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreToLoad && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "0px", threshold: 1.0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreToLoad, loadingMore, loadMore]);

  // Helper: update filters and reset page to 1
  const updateFilters = useCallback((newFilters: Partial<FiltersState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  // ── Slider value helpers ─────────────────────────────────────────────────
  // Empty string in `filters` = "no bound". We map that to the slider min/max
  // so the thumb sits at the edge without activating a filter chip.
  const priceSliderValue: [number, number] = [
    filters.minPrice ? Math.min(Number(filters.minPrice), PRICE_RANGE.max) : PRICE_RANGE.min,
    filters.maxPrice ? Math.min(Number(filters.maxPrice), PRICE_RANGE.max) : PRICE_RANGE.max,
  ];
  const yearSliderValue: [number, number] = [
    filters.minYear ? Math.min(Number(filters.minYear), YEAR_RANGE.max) : YEAR_RANGE.min,
    filters.maxYear ? Math.min(Number(filters.maxYear), YEAR_RANGE.max) : YEAR_RANGE.max,
  ];
  const kmSliderValue: [number, number] = [
    filters.minKm ? Math.min(Number(filters.minKm), KM_RANGE.max) : KM_RANGE.min,
    filters.maxKm ? Math.min(Number(filters.maxKm), KM_RANGE.max) : KM_RANGE.max,
  ];

  const handlePriceSliderChange = useCallback(
    (values: number[]) => {
      const [lo, hi] = values as [number, number];
      updateFilters({
        minPrice: lo === PRICE_RANGE.min ? "" : String(lo),
        maxPrice: hi === PRICE_RANGE.max ? "" : String(hi),
      });
    },
    [updateFilters]
  );
  const handleYearSliderChange = useCallback(
    (values: number[]) => {
      const [lo, hi] = values as [number, number];
      updateFilters({
        minYear: lo === YEAR_RANGE.min ? "" : String(lo),
        maxYear: hi === YEAR_RANGE.max ? "" : String(hi),
      });
    },
    [updateFilters]
  );
  const handleKmSliderChange = useCallback(
    (values: number[]) => {
      const [lo, hi] = values as [number, number];
      updateFilters({
        minKm: lo === KM_RANGE.min ? "" : String(lo),
        maxKm: hi === KM_RANGE.max ? "" : String(hi),
      });
    },
    [updateFilters]
  );

  const updateSort = useCallback((newSort: string) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const updateSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  }, []);

  const handleQuickView = (listing: Listing) => {
    setQuickViewListing(listing);
    setQuickViewOpen(true);
  };

  const clearFilters = () => {
    setFilters({
      category: "all",
      minPrice: "",
      maxPrice: "",
      zone: "all",
      minRating: "0",
      verifiedOnly: false,
      withPhoto: false,
      featuredOnly: false,
      minYear: "",
      maxYear: "",
      minKm: "",
      maxKm: "",
      rooms: "all",
      operation: "all",
    });
    setSearch("");
    setPage(1);
  };

  // ── Quick chip click handler ─────────────────────────────────────────────
  // Maps a chip action to the appropriate filter/sort update. Toggle chips
  // flip a boolean; value chips toggle off if already set to the same value;
  // multi chips apply a set of changes (or reset them if already active);
  // visual chips just toast their tooltip text.
  const handleChipClick = useCallback(
    (chip: QuickChip) => {
      const a = chip.action;
      switch (a.type) {
        case "sort":
          updateSort(a.value);
          break;
        case "toggle": {
          const next = !filters[a.key];
          updateFilters({ [a.key]: next } as Partial<FiltersState>);
          break;
        }
        case "value": {
          const current = filters[a.key];
          if (current === a.value) {
            // Toggle off — reset to "all" for select-like filters, "" otherwise
            const resetVal =
              a.key === "zone" || a.key === "rooms" || a.key === "operation"
                ? "all"
                : "";
            updateFilters({ [a.key]: resetVal } as Partial<FiltersState>);
          } else {
            updateFilters({ [a.key]: a.value } as Partial<FiltersState>);
          }
          break;
        }
        case "multi": {
          const allMatch = Object.entries(a.changes).every(
            ([k, v]) => (filters as Record<string, unknown>)[k] === v
          );
          if (allMatch) {
            const reset: Partial<FiltersState> = {};
            for (const k of Object.keys(a.changes) as (keyof FiltersState)[]) {
              (reset as Record<string, unknown>)[k] =
                k === "zone" || k === "rooms" || k === "operation" ? "all" : "";
            }
            updateFilters(reset);
          } else {
            updateFilters(a.changes);
          }
          break;
        }
        case "visual":
          if (chip.tooltip) toast.info(chip.tooltip, { duration: 2500 });
          break;
      }
    },
    [filters, updateFilters, updateSort]
  );

  const handleSaveSearch = () => {
    const searchType: SavedSearchType = config.type as SavedSearchType;
    const searchFilters = {
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      zone: filters.zone,
      minRating: filters.minRating,
      verifiedOnly: filters.verifiedOnly,
      withPhoto: filters.withPhoto,
      featuredOnly: filters.featuredOnly,
      minYear: filters.minYear,
      maxYear: filters.maxYear,
      minKm: filters.minKm,
      maxKm: filters.maxKm,
      rooms: filters.rooms,
      operation: filters.operation,
    };

    if (isSearchSaved(search, searchType, searchFilters)) {
      toast.info("Esta búsqueda ya está guardada");
      return;
    }

    const result = addSavedSearch({
      query: search,
      type: searchType,
      filters: searchFilters,
    });

    if (result === null) {
      toast.info("Esta búsqueda ya está guardada");
      return;
    }

    if (!result) {
      toast.error("Máximo 10 búsquedas guardadas");
      return;
    }

    toast.success("Búsqueda guardada", { duration: 2500 });
  };

  const handleApplySavedSearch = (saved: SavedSearch) => {
    setSearch(saved.query);
    setFilters({
      category: saved.filters.category || "all",
      minPrice: saved.filters.minPrice || "",
      maxPrice: saved.filters.maxPrice || "",
      zone: saved.filters.zone || "all",
      minRating: saved.filters.minRating || "0",
      verifiedOnly: saved.filters.verifiedOnly || false,
      withPhoto: saved.filters.withPhoto || false,
      featuredOnly: saved.filters.featuredOnly || false,
      minYear: (saved.filters.minYear as string) || "",
      maxYear: (saved.filters.maxYear as string) || "",
      minKm: (saved.filters.minKm as string) || "",
      maxKm: (saved.filters.maxKm as string) || "",
      rooms: (saved.filters.rooms as string) || "all",
      operation: (saved.filters.operation as string) || "all",
    });
    setPage(1);
    toast.success("Búsqueda aplicada", { duration: 2000 });
  };

  const activeFilterCount =
    (filters.category !== "all" ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.zone !== "all" ? 1 : 0) +
    (filters.minRating !== "0" ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.withPhoto ? 1 : 0) +
    (filters.featuredOnly ? 1 : 0) +
    (filters.minYear ? 1 : 0) +
    (filters.maxYear ? 1 : 0) +
    (filters.minKm ? 1 : 0) +
    (filters.maxKm ? 1 : 0) +
    (filters.rooms !== "all" ? 1 : 0) +
    (filters.operation !== "all" ? 1 : 0);

  // ── Filters panel (sidebar + mobile Sheet share this markup) ─────────────
  const FiltersPanel = (
    <div className="space-y-5">
      {/* Categoría / Marca / Tipo */}
      <div className="space-y-1.5">
        <h3 className="font-semibold text-sm text-[var(--umpi-text)]">
          {pageKey === "servicios" ? "Categoría" : pageKey === "autos" ? "Marca" : "Tipo"}
        </h3>
        <label className="flex items-center justify-between w-full text-sm cursor-pointer group">
          <span className="flex items-center gap-2 min-w-0">
            <Checkbox
              checked={filters.category === "all"}
              onCheckedChange={() => updateFilters({ category: "all" })}
              className="shrink-0"
            />
            <span
              className={`truncate group-hover:text-[var(--umpi-text)] transition-colors ${
                filters.category === "all"
                  ? "text-[var(--umpi-accent)] font-medium"
                  : "text-[var(--umpi-text2)]"
              }`}
            >
              Todas
            </span>
          </span>
          <span className="font-mono text-xs text-[var(--umpi-text3)] shrink-0">
            ({categories?.reduce((s, c) => s + c.count, 0) || 0})
          </span>
        </label>
        {categories?.map((cat) => (
          <label
            key={cat.id}
            className="flex items-center justify-between w-full text-sm cursor-pointer group"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Checkbox
                checked={filters.category === cat.slug}
                onCheckedChange={() => updateFilters({ category: cat.slug })}
                className="shrink-0"
              />
              <span
                className={`truncate group-hover:text-[var(--umpi-text)] transition-colors ${
                  filters.category === cat.slug
                    ? "text-[var(--umpi-accent)] font-medium"
                    : "text-[var(--umpi-text2)]"
                }`}
              >
                {cat.name}
              </span>
            </span>
            <span className="font-mono text-xs text-[var(--umpi-text3)] shrink-0">
              ({cat.count})
            </span>
          </label>
        ))}
      </div>

      <Separator className="bg-[var(--umpi-border)]" />

      {/* Precio — dual-handle slider + small number inputs as alternative */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-[var(--umpi-text)]">
          Rango de precio (ARS)
        </h3>
        <Slider
          min={PRICE_RANGE.min}
          max={PRICE_RANGE.max}
          step={PRICE_RANGE.step}
          value={priceSliderValue}
          onValueChange={handlePriceSliderChange}
          className="mt-1"
          aria-label="Rango de precio"
        />
        <div className="flex items-center justify-between text-xs text-[var(--umpi-text2)]">
          <span>Desde {arsFormatter.format(priceSliderValue[0])}</span>
          <span>Hasta {arsFormatter.format(priceSliderValue[1])}</span>
        </div>
        {/* Manual number inputs — alternative to the slider */}
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Mín"
            value={filters.minPrice}
            onChange={(e) => updateFilters({ minPrice: e.target.value })}
            className="h-8 text-xs"
            min={0}
            max={PRICE_RANGE.max}
            step={PRICE_RANGE.step}
          />
          <Input
            type="number"
            placeholder="Máx"
            value={filters.maxPrice}
            onChange={(e) => updateFilters({ maxPrice: e.target.value })}
            className="h-8 text-xs"
            min={0}
            max={PRICE_RANGE.max}
            step={PRICE_RANGE.step}
          />
        </div>
      </div>

      {/* Vehículo: Año y Kilómetros — solo en autos */}
      {pageKey === "autos" && (
        <>
          <Separator className="bg-[var(--umpi-border)]" />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-[var(--umpi-text)]">Año</h3>
            <Slider
              min={YEAR_RANGE.min}
              max={YEAR_RANGE.max}
              step={YEAR_RANGE.step}
              value={yearSliderValue}
              onValueChange={handleYearSliderChange}
              className="mt-1"
              aria-label="Rango de año"
            />
            <div className="flex items-center justify-between text-xs text-[var(--umpi-text2)]">
              <span>Desde {yearSliderValue[0]}</span>
              <span>Hasta {yearSliderValue[1]}</span>
            </div>
          </div>

          <Separator className="bg-[var(--umpi-border)]" />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-[var(--umpi-text)]">Kilómetros</h3>
            <Slider
              min={KM_RANGE.min}
              max={KM_RANGE.max}
              step={KM_RANGE.step}
              value={kmSliderValue}
              onValueChange={handleKmSliderChange}
              className="mt-1"
              aria-label="Rango de kilómetros"
            />
            <div className="flex items-center justify-between text-xs text-[var(--umpi-text2)]">
              <span>Desde {numberFormatter.format(kmSliderValue[0])} km</span>
              <span>Hasta {numberFormatter.format(kmSliderValue[1])} km</span>
            </div>
          </div>
        </>
      )}

      {/* Propiedad: Ambientes y Operación — solo en propiedades */}
      {pageKey === "propiedades" && (
        <>
          <Separator className="bg-[var(--umpi-border)]" />
          <div className="space-y-1.5">
            <h3 className="font-semibold text-sm text-[var(--umpi-text)]">Ambientes</h3>
            <RadioGroup
              value={filters.rooms}
              onValueChange={(v) => updateFilters({ rooms: v })}
              className="space-y-1.5"
            >
              {[
                { value: "all", label: "Todos" },
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4+", label: "4+" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer group"
                >
                  <RadioGroupItem
                    value={opt.value}
                    className="data-[state=checked]:border-[var(--umpi-accent)]"
                  />
                  <span
                    className={`group-hover:text-[var(--umpi-text)] transition-colors ${
                      filters.rooms === opt.value
                        ? "text-[var(--umpi-accent)] font-medium"
                        : "text-[var(--umpi-text2)]"
                    }`}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Separator className="bg-[var(--umpi-border)]" />
          <div className="space-y-1.5">
            <h3 className="font-semibold text-sm text-[var(--umpi-text)]">Operación</h3>
            <RadioGroup
              value={filters.operation}
              onValueChange={(v) => updateFilters({ operation: v })}
              className="space-y-1.5"
            >
              {[
                { value: "all", label: "Todas" },
                { value: "Venta", label: "Venta" },
                { value: "Alquiler", label: "Alquiler" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer group"
                >
                  <RadioGroupItem
                    value={opt.value}
                    className="data-[state=checked]:border-[var(--umpi-accent)]"
                  />
                  <span
                    className={`group-hover:text-[var(--umpi-text)] transition-colors ${
                      filters.operation === opt.value
                        ? "text-[var(--umpi-accent)] font-medium"
                        : "text-[var(--umpi-text2)]"
                    }`}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </>
      )}

      <Separator className="bg-[var(--umpi-border)]" />

      {/* Zona */}
      <div className="space-y-1.5">
        <h3 className="font-semibold text-sm text-[var(--umpi-text)]">{config.zoneLabel}</h3>
        <label className="flex items-center justify-between w-full text-sm cursor-pointer group">
          <span className="flex items-center gap-2">
            <Checkbox
              checked={filters.zone === "all"}
              onCheckedChange={() => updateFilters({ zone: "all" })}
            />
            <span
              className={`group-hover:text-[var(--umpi-text)] transition-colors ${
                filters.zone === "all"
                  ? "text-[var(--umpi-accent)] font-medium"
                  : "text-[var(--umpi-text2)]"
              }`}
            >
              Todas
            </span>
          </span>
        </label>
        {config.zones.map((zone) => (
          <label
            key={zone}
            className="flex items-center justify-between w-full text-sm cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Checkbox
                checked={filters.zone === zone}
                onCheckedChange={() => updateFilters({ zone })}
              />
              <span
                className={`group-hover:text-[var(--umpi-text)] transition-colors ${
                  filters.zone === zone
                    ? "text-[var(--umpi-accent)] font-medium"
                    : "text-[var(--umpi-text2)]"
                }`}
              >
                {zone}
              </span>
            </span>
          </label>
        ))}
      </div>

      <Separator className="bg-[var(--umpi-border)]" />

      {/* Calificación — star-based selector */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-[var(--umpi-text)]">
          Calificación mínima
        </h3>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const selected = Number(filters.minRating) >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => {
                  // If clicking the same star, toggle off (reset to 0)
                  if (Number(filters.minRating) === star) {
                    updateFilters({ minRating: "0" });
                  } else {
                    updateFilters({ minRating: String(star) });
                  }
                }}
                className="p-0.5 rounded transition-colors hover:bg-[var(--umpi-accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--umpi-accent)]"
                aria-label={`${star} estrella${star > 1 ? "s" : ""} o más`}
                aria-pressed={selected}
              >
                <Star
                  className={`w-5 h-5 transition-colors ${
                    selected
                      ? "fill-[var(--umpi-gold)] text-[var(--umpi-gold)]"
                      : "fill-none text-[var(--umpi-text3)]"
                  }`}
                />
              </button>
            );
          })}
          <span className="ml-2 text-xs text-[var(--umpi-text2)]">
            {filters.minRating === "0"
              ? "Todas"
              : `${filters.minRating}+ estrellas`}
          </span>
        </div>
        {/* Quick reset link */}
        {filters.minRating !== "0" && (
          <button
            type="button"
            onClick={() => updateFilters({ minRating: "0" })}
            className="text-[10px] text-[var(--umpi-accent)] hover:underline"
          >
            Quitar filtro
          </button>
        )}
      </div>

      <Separator className="bg-[var(--umpi-border)]" />

      {/* Filtros avanzados */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-[var(--umpi-text)]">
          Filtros avanzados
        </h3>
        <label className="flex items-center justify-between gap-2 text-sm cursor-pointer">
          <span className="flex items-center gap-2 text-[var(--umpi-text2)]">
            <BadgeCheck className="w-4 h-4 text-[var(--umpi-green)]" />
            Solo vendedores verificados
          </span>
          <Switch
            checked={filters.verifiedOnly}
            onCheckedChange={(v) => updateFilters({ verifiedOnly: v })}
            className="data-[state=checked]:bg-[var(--umpi-accent)]"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm cursor-pointer">
          <span className="flex items-center gap-2 text-[var(--umpi-text2)]">
            <ImageIcon className="w-4 h-4 text-[var(--umpi-accent)]" />
            Con foto
          </span>
          <Switch
            checked={filters.withPhoto}
            onCheckedChange={(v) => updateFilters({ withPhoto: v })}
            className="data-[state=checked]:bg-[var(--umpi-accent)]"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm cursor-pointer">
          <span className="flex items-center gap-2 text-[var(--umpi-text2)]">
            <Star className="w-4 h-4 text-[var(--umpi-gold)]" />
            Solo destacados
          </span>
          <Switch
            checked={filters.featuredOnly}
            onCheckedChange={(v) => updateFilters({ featuredOnly: v })}
            className="data-[state=checked]:bg-[var(--umpi-accent)]"
          />
        </label>
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full border-[var(--umpi-border)] text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)]"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Limpiar filtros ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--umpi-text2)] mb-4">
        <button onClick={() => onNavigate("home")} className="hover:text-[var(--umpi-accent)] flex items-center gap-1">
          <HomeIcon className="w-3.5 h-3.5" />
          Inicio
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[var(--umpi-text3)]" />
        <span className="text-[var(--umpi-text)] font-medium">{config.breadcrumb}</span>
      </nav>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl mb-1">{config.title}</h1>
          <p className="text-sm text-[var(--umpi-text2)]">
            <span className="font-semibold text-[var(--umpi-text)]">
              {data?.total.toLocaleString("es-AR") || "…"}
            </span>{" "}
            {config.totalLabel} encontrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 bg-[var(--umpi-accent)] text-white text-[10px] px-1.5 py-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <SheetHeader>
                <div className="flex items-center justify-between pr-6">
                  <SheetTitle className="flex items-center gap-2">
                    Filtros
                    {activeFilterCount > 0 && (
                      <Badge className="bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </SheetTitle>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-[var(--umpi-accent)] hover:underline underline-offset-2"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </SheetHeader>
              <div className="mt-4">{FiltersPanel}</div>
            </SheetContent>
          </Sheet>

          {/* Sort */}
          <Select value={sort} onValueChange={updateSort}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex items-center bg-[var(--umpi-surface2)] rounded-lg p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded ${view === "grid" ? "bg-white shadow-sm" : ""}`}
              aria-label="Vista de grilla"
            >
              <Grid2x2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded ${view === "list" ? "bg-white shadow-sm" : ""}`}
              aria-label="Vista de lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search box */}
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="search"
          placeholder={`Buscar en ${config.title.toLowerCase()}…`}
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          className="max-w-md h-10 bg-[var(--umpi-surface)]"
        />
        {hasActiveSearchOrFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveSearch}
            className="gap-1.5 border-[var(--umpi-border)] text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] hover:border-[var(--umpi-accent)] whitespace-nowrap"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Guardar búsqueda</span>
          </Button>
        )}
        <SavedSearchesDropdown onApplySearch={handleApplySavedSearch} />
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters - desktop */}
        <aside className="hidden lg:block w-[272px] shrink-0">
          <div className="sticky top-[calc(var(--nav-h)+24px)] bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge className="bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-[var(--umpi-accent)] hover:underline underline-offset-2"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            {FiltersPanel}
          </div>
        </aside>

        {/* Results */}
        <main className="flex-1 min-w-0" ref={resultsRef}>
          {/* ── Quick filter chips bar (Task 8) ────────────────────────────── */}
          {/* Horizontally scrollable row of one-tap shortcuts above the grid.
              Active chips get solid accent bg, inactive chips get surface2 bg
              with accent-soft hover. Visual-only chips show a tooltip. */}
          <div className="flex items-center gap-3 mb-4">
            <span className="hidden sm:block text-xs font-semibold uppercase tracking-wide text-[var(--umpi-text3)] shrink-0">
              Atajos:
            </span>
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin -mx-1 px-1 flex-1 min-w-0">
              {quickChips.map((chip) => {
                const active = chip.isActive({ sort, filters });
                const Icon = chip.icon;
                const chipEl = (
                  <button
                    onClick={() => handleChipClick(chip)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                      active
                        ? "bg-[var(--umpi-accent)] text-white border-[var(--umpi-accent)] shadow-sm"
                        : "bg-[var(--umpi-surface2)] text-[var(--umpi-text2)] border-transparent hover:bg-[var(--umpi-accent-soft)] hover:text-[var(--umpi-accent)]"
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {chip.label}
                  </button>
                );
                if (chip.tooltip) {
                  return (
                    <Tooltip key={chip.id}>
                      <TooltipTrigger asChild>{chipEl}</TooltipTrigger>
                      <TooltipContent>{chip.tooltip}</TooltipContent>
                    </Tooltip>
                  );
                }
                return <Fragment key={chip.id}>{chipEl}</Fragment>;
              })}
            </div>
          </div>

          {/* Result count + active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {filters.category !== "all" && (
                <ActiveChip
                  label={categories?.find((c) => c.slug === filters.category)?.name ?? "Categoría"}
                  onRemove={() => updateFilters({ category: "all" })}
                />
              )}
              {filters.zone !== "all" && (
                <ActiveChip
                  label={filters.zone}
                  icon={MapPin}
                  onRemove={() => updateFilters({ zone: "all" })}
                />
              )}
              {filters.minPrice && (
                <ActiveChip
                  label={`Desde ${arsFormatter.format(Number(filters.minPrice))}`}
                  onRemove={() => updateFilters({ minPrice: "" })}
                />
              )}
              {filters.maxPrice && (
                <ActiveChip
                  label={`Hasta ${arsFormatter.format(Number(filters.maxPrice))}`}
                  onRemove={() => updateFilters({ maxPrice: "" })}
                />
              )}
              {filters.minRating !== "0" && (
                <ActiveChip
                  label={`${filters.minRating}+ ★`}
                  icon={Star}
                  onRemove={() => updateFilters({ minRating: "0" })}
                />
              )}
              {filters.verifiedOnly && (
                <ActiveChip
                  label="Verificados"
                  icon={BadgeCheck}
                  onRemove={() => updateFilters({ verifiedOnly: false })}
                />
              )}
              {filters.withPhoto && (
                <ActiveChip
                  label="Con foto"
                  icon={ImageIcon}
                  onRemove={() => updateFilters({ withPhoto: false })}
                />
              )}
              {filters.featuredOnly && (
                <ActiveChip
                  label="Destacados"
                  icon={Star}
                  onRemove={() => updateFilters({ featuredOnly: false })}
                />
              )}
              {/* Vehicle: Año / Km chips */}
              {(filters.minYear || filters.maxYear) && (
                <ActiveChip
                  label={`Año ${filters.minYear || YEAR_RANGE.min} – ${filters.maxYear || YEAR_RANGE.max}`}
                  onRemove={() => updateFilters({ minYear: "", maxYear: "" })}
                />
              )}
              {(filters.minKm || filters.maxKm) && (
                <ActiveChip
                  label={`${filters.minKm ? `${numberFormatter.format(Number(filters.minKm))} km` : "0 km"} – ${filters.maxKm ? `${numberFormatter.format(Number(filters.maxKm))} km` : `${numberFormatter.format(KM_RANGE.max)} km`}`}
                  onRemove={() => updateFilters({ minKm: "", maxKm: "" })}
                />
              )}
              {/* Property: Ambientes / Operación chips */}
              {filters.rooms !== "all" && (
                <ActiveChip
                  label={
                    filters.rooms === "4+"
                      ? "4+ ambientes"
                      : `${filters.rooms} ambiente${filters.rooms === "1" ? "" : "s"}`
                  }
                  onRemove={() => updateFilters({ rooms: "all" })}
                />
              )}
              {filters.operation !== "all" && (
                <ActiveChip
                  label={filters.operation}
                  onRemove={() => updateFilters({ operation: "all" })}
                />
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] underline-offset-2 hover:underline px-1.5"
              >
                <X className="w-3 h-3" />
                Limpiar todo
              </button>
            </div>
          )}

          {/* Result count — prominent above the grid */}
          <p className="text-sm text-[var(--umpi-text2)] mb-4">
            Mostrando{" "}
            <span className="font-semibold text-[var(--umpi-text)]">
              {totalLoaded}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-[var(--umpi-text)]">
              {data?.total.toLocaleString("es-AR") ?? "…"}
            </span>{" "}
            resultados
          </p>

          {isLoading ? (
            <MarketplaceGridSkeleton view={view} count={9} />
          ) : filtered.length === 0 ? (
            <div className="bg-[var(--umpi-surface)] border border-dashed border-[var(--umpi-border)] rounded-xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--umpi-accent-soft)] grid place-items-center">
                <SearchX className="w-8 h-8 text-[var(--umpi-accent)]" />
              </div>
              <p className="text-lg font-semibold text-[var(--umpi-text)] mb-1">No se encontraron resultados</p>
              <p className="text-sm text-[var(--umpi-text2)] mb-5">
                Probá con otros filtros o términos de búsqueda
              </p>
              <Button onClick={clearFilters} variant="default" className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)]">
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <>
              <div
                className={
                  view === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "flex flex-col gap-3"
                }
              >
                {filtered.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={() => onNavigate("detail", { id: listing.id, slug: listing.slug })}
                    onQuickView={() => handleQuickView(listing)}
                  />
                ))}
              </div>

              {/* "Cargar más" button + IntersectionObserver sentinel for auto-load */}
              {hasMoreToLoad && (
                <div className="flex flex-col items-center gap-3 mt-8 pb-20 md:pb-4">
                  <Button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                    className="h-11 px-6 border-2 border-[var(--umpi-accent)] text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent)] hover:text-white gap-2 font-medium"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando…
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="w-4 h-4" />
                        Cargar más resultados
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-[var(--umpi-text3)]">
                    {totalAvailable - totalLoaded} restantes
                  </p>
                  {/* Sentinel for IntersectionObserver auto-load */}
                  <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
                </div>
              )}

              {/* Show "Fin de los resultados" when all loaded */}
              {!hasMoreToLoad && totalLoaded > 0 && (
                <div className="flex flex-col items-center gap-2 mt-8 pb-20 md:pb-4">
                  <div className="flex items-center gap-3 text-[var(--umpi-text3)] text-xs">
                    <span className="h-px flex-1 bg-[var(--umpi-border)] w-16" />
                    <span>Fin de los resultados</span>
                    <span className="h-px flex-1 bg-[var(--umpi-border)] w-16" />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <QuickViewModal
        listing={quickViewListing}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onNavigateToDetail={(slug) => {
          onNavigate("detail", { slug });
        }}
        onContact={(listing) => {
          onNavigate("detail", { slug: listing.slug || listing.id });
        }}
      />
    </div>
  );
}
