"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("scroll", callback, { passive: true });
  window.addEventListener("resize", callback, { passive: true });
  return () => {
    window.removeEventListener("scroll", callback);
    window.removeEventListener("resize", callback);
  };
}

function getScrollProgress(): number {
  if (typeof window === "undefined") return 0;
  const scrollTop = window.scrollY;
  const docHeight =
    document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight <= 0) return 0;
  const progress = (scrollTop / docHeight) * 100;
  return Math.min(100, Math.max(0, progress));
}

const serverSnapshot = () => 0;

export function ScrollProgress() {
  const progress = useSyncExternalStore(subscribe, getScrollProgress, serverSnapshot);
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[60] h-1 bg-[var(--umpi-border)]/30 pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-[var(--umpi-accent)] to-[var(--umpi-accent2)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
