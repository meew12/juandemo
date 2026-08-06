"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import type { Listing } from "@/lib/types";

const STORAGE_KEY = "umpi-compare";
const MAX_ITEMS = 3;
const CHANGE_EVENT = "umpi-compare-change";

interface CompareContextValue {
  compareItems: Listing[];
  addToCompare: (listing: Listing) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  canAddMore: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

// Cached snapshot — MUST be referentially stable across calls when the
// underlying localStorage string hasn't changed, otherwise React's
// useSyncExternalStore will detect a "change" every render and loop forever.
let cachedRaw: string | null = undefined; // undefined = not yet read
let cachedItems: Listing[] = [];

/**
 * Read the current compare list from localStorage. Returns the SAME array
 * reference across calls as long as the raw localStorage string is unchanged
 * (required by useSyncExternalStore). Returns an empty array on any error.
 */
function readStore(): Listing[] {
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
    const parsed = JSON.parse(raw) as Listing[];
    cachedItems = Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
    return cachedItems;
  } catch {
    cachedItems = [];
    return cachedItems;
  }
}

/**
 * Write the compare list to localStorage and notify all subscribers.
 */
function writeStore(items: Listing[]): void {
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
function getSnapshot(): Listing[] {
  return readStore();
}

// Module-level constant so getServerSnapshot always returns the same reference.
// React's useSyncExternalStore requires the server snapshot to be referentially
// stable across calls, otherwise it triggers an infinite re-render loop.
const EMPTY_SNAPSHOT: Listing[] = [];

/**
 * Server snapshot — always empty so SSR markup matches the initial client
 * hydration (localStorage is unavailable during SSR).
 */
function getServerSnapshot(): Listing[] {
  return EMPTY_SNAPSHOT;
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const compareItems = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const addToCompare = useCallback((listing: Listing) => {
    const current = readStore();
    if (current.some((item) => item.id === listing.id)) {
      return;
    }
    if (current.length >= MAX_ITEMS) {
      toast.error("Máximo 3 publicaciones para comparar");
      return;
    }
    writeStore([...current, listing]);
    toast.success(`"${listing.title}" agregado a comparación`, {
      duration: 2500,
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    const current = readStore();
    const found = current.find((item) => item.id === id);
    if (!found) return;
    writeStore(current.filter((item) => item.id !== id));
    toast.success(`"${found.title}" quitado de comparación`, {
      duration: 2000,
    });
  }, []);

  const clearCompare = useCallback(() => {
    const current = readStore();
    if (current.length === 0) return;
    writeStore([]);
    toast.success("Comparación limpiada", { duration: 2000 });
  }, []);

  const isInCompare = useCallback(
    (id: string) => compareItems.some((item) => item.id === id),
    [compareItems]
  );

  const canAddMore = compareItems.length < MAX_ITEMS;

  const value = useMemo<CompareContextValue>(
    () => ({
      compareItems,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      canAddMore,
    }),
    [compareItems, addToCompare, removeFromCompare, clearCompare, isInCompare, canAddMore]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return ctx;
}

export { MAX_ITEMS as COMPARE_MAX_ITEMS };
