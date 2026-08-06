"use client";

import { X, GitCompare, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCompare, COMPARE_MAX_ITEMS } from "@/components/compare-context";
import { safeJsonParse } from "@/lib/utils-umpi";
import type { Listing } from "@/lib/types";

const OPEN_EVENT = "umpi-compare-open";

export function CompareBar({ onNavigate }: { onNavigate?: (page: string, params?: any) => void }) {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const [expanded, setExpanded] = useState(true);

  // Add body scroll padding when compare items are present, so the floating bar
  // doesn't cover footer/content at the bottom of the page.
  useEffect(() => {
    if (compareItems.length > 0) {
      document.body.classList.add("umpi-compare-visible");
    } else {
      document.body.classList.remove("umpi-compare-visible");
    }
    return () => document.body.classList.remove("umpi-compare-visible");
  }, [compareItems.length]);

  if (compareItems.length === 0) {
    return null;
  }

  const handleOpenCompare = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(OPEN_EVENT));
    }
  };

  return (
    <div
      role="region"
      aria-label="Barra de comparación"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-4 sm:right-4 z-40 w-auto sm:w-96 animate-slide-up"
    >
      <div className="bg-[var(--umpi-surface)]/95 backdrop-blur-md border border-[var(--umpi-border)] rounded-2xl shadow-[0_12px_40px_rgba(26,22,18,0.25)] overflow-hidden">
        {/* Header row — always visible */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-[var(--umpi-accent-soft)]/40">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--umpi-text)] hover:text-[var(--umpi-accent)] transition-colors"
            aria-expanded={expanded}
            aria-controls="umpi-compare-body"
          >
            <GitCompare className="w-4 h-4 text-[var(--umpi-accent)]" />
            Comparar
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[var(--umpi-accent)] text-white text-[10px] font-bold">
              {compareItems.length}/{COMPARE_MAX_ITEMS}
            </span>
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--umpi-text3)]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-[var(--umpi-text3)]" />
            )}
          </button>
          <button
            type="button"
            onClick={clearCompare}
            aria-label="Limpiar comparación"
            title="Limpiar"
            className="text-[var(--umpi-text3)] hover:text-[var(--umpi-accent)] transition-colors p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body — collapsible */}
        {expanded && (
          <div id="umpi-compare-body" className="p-3 space-y-3">
            {/* Thumbnails list */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 scrollbar-thin">
              {compareItems.map((item) => (
                <CompareThumb
                  key={item.id}
                  listing={item}
                  onRemove={() => removeFromCompare(item.id)}
                />
              ))}
              {/* Slot placeholders for empty slots */}
              {Array.from({ length: Math.max(0, COMPARE_MAX_ITEMS - compareItems.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="shrink-0 w-20 sm:w-24 h-12 rounded-lg border border-dashed border-[var(--umpi-border)] grid place-items-center text-[10px] text-[var(--umpi-text3)]"
                >
                  + Agregar
                </div>
              ))}
            </div>

            {/* Action row */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleOpenCompare}
                disabled={compareItems.length < 2}
                className="flex-1 h-9 bg-[var(--umpi-accent)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <GitCompare className="w-3.5 h-3.5 mr-1.5" />
                {compareItems.length < 2
                  ? `Elegí ${COMPARE_MAX_ITEMS - compareItems.length} más`
                  : "Comparar ahora"}
              </Button>
            </div>

            {compareItems.length < 2 && (
              <p className="text-[11px] text-[var(--umpi-text3)] text-center">
                Agregá al menos 2 publicaciones para comparar.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompareThumb({
  listing,
  onRemove,
}: {
  listing: Listing;
  onRemove: () => void;
}) {
  const images = safeJsonParse<string[]>(listing.images, []);
  const thumb = images[0] || "";
  return (
    <div className="group/thumb relative shrink-0 w-20 sm:w-24 bg-[var(--umpi-surface2)] rounded-lg overflow-hidden border border-[var(--umpi-border)]">
      <div className="flex items-center gap-2 p-1.5">
        <div className="w-9 h-9 rounded-md overflow-hidden bg-[var(--umpi-surface2)] shrink-0">
          {thumb ? (
            <img
              src={thumb}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-[9px] text-[var(--umpi-text3)] font-semibold">
              UMPI
            </div>
          )}
        </div>
        <span className="text-[11px] text-[var(--umpi-text2)] line-clamp-1 leading-tight">
          {listing.title}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${listing.title}`}
        className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors opacity-0 group-hover/thumb:opacity-100 focus-visible:opacity-100"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
