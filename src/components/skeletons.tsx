"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton that mimics the ListingCard structure.
 * - aspect-[4/3] image area skeleton
 * - category label skeleton
 * - title skeleton (2 lines)
 * - price skeleton
 * - stats row skeleton (3 small lines)
 * - seller row skeleton (avatar circle + name line)
 * - rounded-xl container with border
 */
export function ListingCardSkeleton({ list = false }: { list?: boolean }) {
  if (list) {
    // Horizontal card layout for list view
    return (
      <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl overflow-hidden flex">
        {/* Image area */}
        <Skeleton className="w-32 sm:w-44 aspect-[4/3] shrink-0 rounded-none bg-[var(--umpi-surface2)]" />
        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col gap-2">
          <Skeleton className="h-3 w-16 bg-[var(--umpi-surface2)]" />
          <Skeleton className="h-4 w-3/4 bg-[var(--umpi-surface2)]" />
          <Skeleton className="h-4 w-1/2 bg-[var(--umpi-surface2)]" />
          <Skeleton className="h-6 w-28 bg-[var(--umpi-surface2)] mt-1" />
          <div className="flex items-center gap-3 mt-1">
            <Skeleton className="h-3 w-20 bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-3 w-16 bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-3 w-12 bg-[var(--umpi-surface2)]" />
          </div>
          <div className="flex items-center gap-2 pt-2 mt-auto border-t border-[var(--umpi-border)]">
            <Skeleton className="w-6 h-6 rounded-full bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-3 w-24 bg-[var(--umpi-surface2)]" />
          </div>
        </div>
      </div>
    );
  }

  // Default vertical card layout
  return (
    <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl overflow-hidden">
      {/* Image area */}
      <Skeleton className="aspect-[4/3] w-full rounded-none bg-[var(--umpi-surface2)]" />
      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col gap-2">
        {/* Category label */}
        <Skeleton className="h-3 w-20 bg-[var(--umpi-surface2)]" />
        {/* Title — 2 lines */}
        <Skeleton className="h-4 w-full bg-[var(--umpi-surface2)]" />
        <Skeleton className="h-4 w-2/3 bg-[var(--umpi-surface2)]" />
        {/* Price */}
        <Skeleton className="h-6 w-28 bg-[var(--umpi-surface2)] mt-1" />
        {/* Stats row — 3 small lines */}
        <div className="flex items-center gap-3 mt-1">
          <Skeleton className="h-3 w-20 bg-[var(--umpi-surface2)]" />
          <Skeleton className="h-3 w-16 bg-[var(--umpi-surface2)]" />
          <Skeleton className="h-3 w-12 bg-[var(--umpi-surface2)] ml-auto" />
        </div>
        {/* Seller row */}
        <div className="flex items-center gap-2 pt-2 mt-1 border-t border-[var(--umpi-border)]">
          <Skeleton className="w-6 h-6 rounded-full bg-[var(--umpi-surface2)]" />
          <Skeleton className="h-3 w-24 bg-[var(--umpi-surface2)]" />
          <Skeleton className="h-4 w-10 bg-[var(--umpi-surface2)] ml-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton grid/list for the marketplace results.
 * - Renders `count` ListingCardSkeleton in grid or list layout
 * - Default count: 9
 * - Grid: grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4
 * - List: flex flex-col gap-3 with horizontal cards
 */
export function MarketplaceGridSkeleton({
  count = 9,
  view = "grid",
}: {
  count?: number;
  view?: "grid" | "list";
}) {
  return (
    <div
      className={cn(
        view === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          : "flex flex-col gap-3",
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} list={view === "list"} />
      ))}
    </div>
  );
}

/**
 * Skeleton that mimics the detail page layout.
 * - Breadcrumb skeleton
 * - Title skeleton (large)
 * - Location + stats row skeleton
 * - Two-column layout: main image gallery skeleton + sidebar card skeleton
 * - Description paragraph skeletons (3-4 lines)
 * - Reviews section skeleton
 */
export function DetailPageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-16 bg-[var(--umpi-surface2)]" />
        <Skeleton className="h-3 w-3 rounded-full bg-[var(--umpi-surface2)]" />
        <Skeleton className="h-4 w-20 bg-[var(--umpi-surface2)]" />
        <Skeleton className="h-3 w-3 rounded-full bg-[var(--umpi-surface2)]" />
        <Skeleton className="h-4 w-32 bg-[var(--umpi-surface2)]" />
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Main column */}
        <div className="space-y-6">
          {/* Image gallery skeleton */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full rounded-none bg-[var(--umpi-surface2)]" />
            <div className="flex gap-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="w-20 h-20 rounded-lg bg-[var(--umpi-surface2)] shrink-0"
                />
              ))}
            </div>
          </div>

          {/* Title + meta card */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 space-y-3">
            <Skeleton className="h-3 w-32 bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-9 w-3/4 bg-[var(--umpi-surface2)]" />
            {/* Location + stats row */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-28 bg-[var(--umpi-surface2)]" />
              <Skeleton className="h-4 w-20 bg-[var(--umpi-surface2)]" />
              <Skeleton className="h-4 w-24 bg-[var(--umpi-surface2)]" />
              <Skeleton className="h-4 w-28 bg-[var(--umpi-surface2)]" />
            </div>
            {/* Price */}
            <Skeleton className="h-3 w-24 bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-9 w-48 bg-[var(--umpi-surface2)]" />
          </div>

          {/* Description */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 space-y-3">
            <Skeleton className="h-5 w-40 bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-3 w-full bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-3 w-full bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-3 w-5/6 bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-3 w-full bg-[var(--umpi-surface2)]" />
          </div>

          {/* Reviews section */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 space-y-4">
            <Skeleton className="h-6 w-44 bg-[var(--umpi-surface2)]" />
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex gap-3 p-3 border border-[var(--umpi-border)] rounded-lg"
              >
                <Skeleton className="w-10 h-10 rounded-full bg-[var(--umpi-surface2)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-[var(--umpi-surface2)]" />
                  <Skeleton className="h-3 w-full bg-[var(--umpi-surface2)]" />
                  <Skeleton className="h-3 w-2/3 bg-[var(--umpi-surface2)]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Price card */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 space-y-3">
            <Skeleton className="h-3 w-24 bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-10 w-40 bg-[var(--umpi-surface2)]" />
            <Skeleton className="h-11 w-full bg-[var(--umpi-surface2)] rounded-full" />
            <Skeleton className="h-11 w-full bg-[var(--umpi-surface2)] rounded-full" />
          </div>
          {/* Seller card */}
          <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 space-y-3">
            <Skeleton className="h-5 w-32 bg-[var(--umpi-surface2)]" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-14 h-14 rounded-full bg-[var(--umpi-surface2)]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28 bg-[var(--umpi-surface2)]" />
                <Skeleton className="h-3 w-24 bg-[var(--umpi-surface2)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Skeleton className="h-12 w-full bg-[var(--umpi-surface2)] rounded-lg" />
              <Skeleton className="h-12 w-full bg-[var(--umpi-surface2)] rounded-lg" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Skeleton that mimics the profile page layout.
 * - Header card skeleton (avatar + name + plan badge)
 * - Tab bar skeleton
 * - Listings grid skeleton
 */
export function ProfilePageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Header card */}
      <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Skeleton className="w-20 h-20 rounded-full bg-[var(--umpi-surface2)] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-48 bg-[var(--umpi-surface2)]" />
              <Skeleton className="w-5 h-5 rounded-full bg-[var(--umpi-surface2)]" />
            </div>
            <Skeleton className="h-4 w-56 bg-[var(--umpi-surface2)]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 bg-[var(--umpi-surface2)] rounded-full" />
              <Skeleton className="h-3 w-32 bg-[var(--umpi-surface2)]" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 bg-[var(--umpi-surface2)] rounded-full" />
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--umpi-surface2)] rounded-lg p-3 text-center space-y-2"
            >
              <Skeleton className="w-4 h-4 mx-auto bg-[var(--umpi-border)]" />
              <Skeleton className="h-6 w-12 mx-auto bg-[var(--umpi-border)]" />
              <Skeleton className="h-3 w-20 mx-auto bg-[var(--umpi-border)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 mb-4 bg-[var(--umpi-surface2)] rounded-lg p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full bg-[var(--umpi-border)] rounded-md" />
        ))}
      </div>

      {/* Listings grid skeleton */}
      <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-48 bg-[var(--umpi-surface2)]" />
          <Skeleton className="h-9 w-36 bg-[var(--umpi-surface2)] rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton that mimics the home hero section.
 * - Large heading skeleton
 * - Subtitle skeleton
 * - Search bar skeleton
 * - Stats row skeleton (4 cards)
 */
export function HomeHeroSkeleton() {
  return (
    <section className="relative overflow-hidden text-white hero-gradient">
      <div className="absolute inset-0 hero-glow" />
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <Skeleton className="h-7 w-56 mx-auto mb-4 rounded-full bg-white/10" />
          {/* Heading */}
          <Skeleton className="h-12 sm:h-14 w-3/4 mx-auto mb-4 bg-white/10" />
          <Skeleton className="h-12 sm:h-14 w-1/2 mx-auto mb-4 bg-white/10" />
          {/* Subtitle */}
          <Skeleton className="h-5 w-2/3 mx-auto mb-8 bg-white/10" />
          <Skeleton className="h-5 w-1/2 mx-auto mb-8 bg-white/10" />
          {/* Search bar */}
          <Skeleton className="h-14 w-full max-w-2xl mx-auto rounded-full bg-white/10 mb-6" />
          {/* Suggestions */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Skeleton className="h-4 w-20 bg-white/10" />
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-7 w-24 rounded-full bg-white/10"
              />
            ))}
          </div>
        </div>

        {/* Stats — 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 text-center space-y-2"
            >
              <Skeleton className="w-5 h-5 mx-auto bg-white/20" />
              <Skeleton className="h-7 w-16 mx-auto bg-white/20" />
              <Skeleton className="h-3 w-20 mx-auto bg-white/20" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
