"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/lib/types";

const STORAGE_KEY = "umpi_recently_viewed";
const MAX_ITEMS = 8;

export function trackRecentlyViewed(listingId: string, slug: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const items: { id: string; slug: string; ts: number }[] = stored ? JSON.parse(stored) : [];
    // Remove if already exists
    const filtered = items.filter((i) => i.id !== listingId);
    // Add to front
    filtered.unshift({ id: listingId, slug, ts: Date.now() });
    // Keep only last MAX_ITEMS
    const trimmed = filtered.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    // Dispatch event for same-page updates
    window.dispatchEvent(new Event("umpi-recently-viewed-changed"));
  } catch (e) {
    // localStorage not available
  }
}

export function getRecentlyViewed(): { id: string; slug: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const items = JSON.parse(stored) as { id: string; slug: string; ts: number }[];
    return items.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function clearRecentlyViewed() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("umpi-recently-viewed-changed"));
}

async function fetchRecentlyViewed(ids: string[]) {
  if (ids.length === 0) return [];
  const res = await fetch(`/api/listings?ids=${ids.join(",")}&limit=${ids.length}`);
  if (!res.ok) return [];
  const data = await res.json();
  // Sort by the order in ids
  const listings = data.listings as Listing[];
  return ids
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is Listing => !!l);
}

export function RecentlyViewedSection({
  onNavigate,
}: {
  onNavigate: (page: string, params?: any) => void;
}) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const update = () => {
      const items = getRecentlyViewed();
      setIds(items.map((i) => i.id));
    };
    update();
    window.addEventListener("umpi-recently-viewed-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("umpi-recently-viewed-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["recently-viewed", ids],
    queryFn: () => fetchRecentlyViewed(ids),
    enabled: ids.length > 0,
  });

  if (!ids.length || !listings || listings.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between mb-5">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg grid place-items-center"
            style={{ background: "var(--umpi-blue-soft)" }}
          >
            <History className="w-4 h-4" style={{ color: "var(--umpi-blue)" }} />
          </div>
          <div>
            <h2 className="font-display text-xl sm:text-2xl">Visto recientemente</h2>
            <p className="text-xs text-[var(--umpi-text2)]">
              Continuá donde lo dejaste
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearRecentlyViewed();
            setIds([]);
          }}
          className="text-[var(--umpi-text3)] hover:text-[var(--umpi-accent)] hover:bg-[var(--umpi-surface2)] text-xs gap-1"
        >
          <X className="w-3 h-3" />
          Limpiar
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {listings.slice(0, 4).map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            compact
            onClick={() => onNavigate("detail", { id: listing.id, slug: listing.slug })}
          />
        ))}
      </div>
    </section>
  );
}
