"use client";

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "umpi-saved-searches";
const MAX_ITEMS = 10;
const CHANGE_EVENT = "umpi-saved-searches-change";

export type SavedSearchType = "servicio" | "auto" | "propiedad" | "all";

export interface SavedSearchFilters {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  zone?: string;
  minRating?: string;
  verifiedOnly?: boolean;
  withPhoto?: boolean;
  featuredOnly?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface SavedSearch {
  id: string;
  query: string;
  type: SavedSearchType;
  filters: SavedSearchFilters;
  createdAt: string;
}

// ── Cached snapshot ──────────────────────────────────────────────────────
// MUST be referentially stable across calls when the underlying localStorage
// string hasn't changed, otherwise React's useSyncExternalStore will detect
// a "change" every render and loop forever.
let cachedRaw: string | null = undefined as unknown as string | null; // undefined = not yet read
let cachedItems: SavedSearch[] = [];

/**
 * Read the current saved searches from localStorage. Returns the SAME array
 * reference across calls as long as the raw localStorage string is unchanged
 * (required by useSyncExternalStore). Returns an empty array on any error.
 */
function readStore(): SavedSearch[] {
  if (typeof window === "undefined") return cachedItems;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedItems;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedItems = [];
      return cachedItems;
    }
    const parsed = JSON.parse(raw) as SavedSearch[];
    cachedItems = Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
    return cachedItems;
  } catch {
    cachedItems = [];
    return cachedItems;
  }
}

/**
 * Write the saved searches to localStorage and notify all subscribers.
 */
function writeStore(items: SavedSearch[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(items);
    window.localStorage.setItem(STORAGE_KEY, raw);
    // Update the cache so the next getSnapshot() returns the new array
    // without an extra JSON.parse.
    cachedRaw = raw;
    cachedItems = items;
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // storage may be unavailable (private mode) — ignore
  }
}

/**
 * useSyncExternalStore subscription. Listens to our custom change event plus
 * the native `storage` event (so changes from other tabs are picked up).
 */
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Client snapshot — reads the latest state from localStorage.
 */
function getSnapshot(): SavedSearch[] {
  return readStore();
}

/**
 * Server snapshot — always empty so SSR markup matches the initial client
 * hydration (localStorage is unavailable during SSR).
 */
function getServerSnapshot(): SavedSearch[] {
  return [];
}

// ── Public API ────────────────────────────────────────────────────────────

export function getSavedSearches(): SavedSearch[] {
  return readStore();
}

export function addSavedSearch(search: Omit<SavedSearch, "id" | "createdAt">): SavedSearch | null {
  const current = readStore();

  // Check for duplicate (same query + type + filters)
  const isDuplicate = current.some(
    (s) =>
      s.query === search.query &&
      s.type === search.type &&
      JSON.stringify(s.filters) === JSON.stringify(search.filters)
  );
  if (isDuplicate) return null; // signal duplicate

  if (current.length >= MAX_ITEMS) return undefined as unknown as SavedSearch; // signal max reached

  const newSearch: SavedSearch = {
    ...search,
    id: `ss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  writeStore([newSearch, ...current]);
  return newSearch;
}

export function removeSavedSearch(id: string): void {
  const current = readStore();
  writeStore(current.filter((s) => s.id !== id));
}

export function clearSavedSearches(): void {
  writeStore([]);
}

/**
 * Check if a search already exists in saved searches.
 */
export function isSearchSaved(
  query: string,
  type: SavedSearchType,
  filters: SavedSearchFilters
): boolean {
  const current = readStore();
  return current.some(
    (s) =>
      s.query === query &&
      s.type === type &&
      JSON.stringify(s.filters) === JSON.stringify(filters)
  );
}

/**
 * React hook that subscribes to saved searches changes.
 */
export function useSavedSearches(): SavedSearch[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
