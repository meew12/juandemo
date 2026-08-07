"use client";

import { useState } from "react";
import { Bookmark, Trash2, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useSavedSearches,
  removeSavedSearch,
  type SavedSearch,
  type SavedSearchType,
} from "@/lib/saved-searches-store";

const TYPE_LABELS: Record<SavedSearchType, string> = {
  servicio: "Servicio",
  auto: "Auto",
  propiedad: "Propiedad",
  all: "Todo",
};

function formatFilterSummary(filters: SavedSearch["filters"]): string {
  const parts: string[] = [];
  if (filters.category && filters.category !== "all") parts.push(filters.category);
  if (filters.zone && filters.zone !== "all") parts.push(filters.zone);
  if (filters.minPrice) parts.push(`desde $${filters.minPrice}`);
  if (filters.maxPrice) parts.push(`hasta $${filters.maxPrice}`);
  if (filters.minRating && filters.minRating !== "0") parts.push(`${filters.minRating}+ ★`);
  if (filters.verifiedOnly) parts.push("Verificados");
  if (filters.withPhoto) parts.push("Con foto");
  if (filters.featuredOnly) parts.push("Destacados");
  return parts.join(" · ");
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Ahora";
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `${diffD}d`;
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

interface SavedSearchesDropdownProps {
  onApplySearch: (search: SavedSearch) => void;
  align?: "start" | "end";
}

export function SavedSearchesDropdown({ onApplySearch, align = "end" }: SavedSearchesDropdownProps) {
  const savedSearches = useSavedSearches();
  const [open, setOpen] = useState(false);

  const handleApply = (search: SavedSearch) => {
    onApplySearch(search);
    setOpen(false);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSavedSearch(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] hover:bg-[var(--umpi-surface2)]"
          aria-label="Búsquedas guardadas"
        >
          <Bookmark className="w-4 h-4" />
          <span className="hidden sm:inline">Guardadas</span>
          {savedSearches.length > 0 && (
            <Badge className="ml-0.5 bg-[var(--umpi-accent)] text-white text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
              {savedSearches.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[340px] p-0 bg-[var(--umpi-surface)] border-[var(--umpi-border)]"
      >
        <div className="px-4 py-3 border-b border-[var(--umpi-border)]">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[var(--umpi-accent)]" />
            Búsquedas guardadas
          </h3>
        </div>

        {savedSearches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Bookmark className="w-10 h-10 text-[var(--umpi-text3)] mb-3" />
            <p className="text-sm text-[var(--umpi-text2)] mb-1">
              No tenés búsquedas guardadas
            </p>
            <p className="text-xs text-[var(--umpi-text3)]">
              Guardá tus búsquedas frecuentes para acceder rápido
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto umpi-scrollbar-thin">
            {savedSearches.map((search) => (
              <button
                key={search.id}
                onClick={() => handleApply(search)}
                className="w-full text-left px-4 py-3 hover:bg-[var(--umpi-surface2)] transition-colors border-b border-[var(--umpi-border)] last:border-b-0 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="w-3.5 h-3.5 text-[var(--umpi-text3)] shrink-0" />
                      <span className="text-sm font-medium truncate text-[var(--umpi-text)]">
                        {search.query || "Sin término"}
                      </span>
                      <Badge
                        className="shrink-0 text-[10px] px-1.5 py-0"
                        style={{
                          background: "var(--umpi-accent-soft)",
                          color: "var(--umpi-accent)",
                        }}
                      >
                        {TYPE_LABELS[search.type]}
                      </Badge>
                    </div>
                    {formatFilterSummary(search.filters) && (
                      <p className="text-xs text-[var(--umpi-text3)] truncate pl-5.5">
                        {formatFilterSummary(search.filters)}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 pl-5.5">
                      <Clock className="w-3 h-3 text-[var(--umpi-text3)]" />
                      <span className="text-[10px] text-[var(--umpi-text3)]">
                        {formatDate(search.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, search.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--umpi-surface)] transition-all text-[var(--umpi-text3)] hover:text-red-500"
                    aria-label="Eliminar búsqueda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
