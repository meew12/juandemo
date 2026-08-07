"use client";

import { useState, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  decimals?: number;
}

// React-recommended pattern for detecting client-side rendering
// without causing hydration mismatches or setState-in-effect issues
const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // client snapshot
    () => false   // server snapshot
  );
}

export function AnimatedCounter({
  value,
  duration = 1500,
  suffix = "",
  prefix = "",
  className = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const mounted = useIsMounted();
  // Initialize to `value` so first client paint matches SSR output (no "0" flash).
  // Animation resets to 0 → value only when the element scrolls into view from outside.
  const [displayValue, setDisplayValue] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  // Initial visibility check runs synchronously BEFORE the browser paints,
  // so the user never sees the "value → 0 → value" flash. If the element is
  // already in viewport on mount, skip the count-up animation entirely.
  useLayoutEffect(() => {
    if (!mounted || !elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const isInitiallyVisible =
      rect.top < windowHeight && rect.bottom > 0 && rect.top >= 0;

    if (isInitiallyVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasAnimated(true);
      setDisplayValue(value);
      return;
    }

    // Element is below the fold — reset to 0 (off-screen, so user won't see the flash)
    // so the count-up effect plays when the user scrolls down to it.
    setDisplayValue(0);
  }, [mounted, value]);

  useEffect(() => {
    if (!mounted || !elementRef.current || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(value * eased);
            if (progress < 1) {
              rafRef.current = requestAnimationFrame(animate);
            }
          };
          rafRef.current = requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(elementRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, hasAnimated, mounted]);

  // Before mount (SSR), render the target value directly to avoid hydration mismatch
  // and to show correct values immediately on the page. After mount, we keep showing
  // the value until the IntersectionObserver fires (which resets to 0 and animates up).
  const currentValue = mounted ? displayValue : value;

  const formatted = currentValue.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
