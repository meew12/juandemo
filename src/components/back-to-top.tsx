"use client";

import { useSyncExternalStore, useCallback } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 400;

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("scroll", callback, { passive: true });
  window.addEventListener("resize", callback, { passive: true });
  return () => {
    window.removeEventListener("scroll", callback);
    window.removeEventListener("resize", callback);
  };
}

function getScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY;
}

const serverSnapshot = () => 0;

export function BackToTop() {
  const scrollY = useSyncExternalStore(subscribe, getScrollY, serverSnapshot);
  const visible = scrollY > SCROLL_THRESHOLD;

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Volver arriba"
      className="fixed bottom-24 right-4 z-40 grid place-items-center w-11 h-11 rounded-full bg-[var(--umpi-accent)] text-white shadow-lg shadow-[var(--umpi-accent)]/25 hover:scale-110 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--umpi-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--umpi-bg)] animate-bounce-in"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
