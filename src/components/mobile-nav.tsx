"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Home, Briefcase, PlusCircle, MessageCircle, User, Search, Heart } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

async function fetchNotifications() {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("Error");
  return res.json() as Promise<{ notifications: Notification[]; unreadCount: number }>;
}

async function fetchFavoritesCount() {
  const res = await fetch("/api/favorites");
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return (data.favorites || []).length as number;
}

const NAV_ITEMS = [
  { key: "home", label: "Inicio", icon: Home, requiresAuth: false },
  { key: "servicios", label: "Explorar", icon: Search, requiresAuth: false },
  { key: "publicar", label: "Publicar", icon: PlusCircle, requiresAuth: true, isFab: true },
  { key: "mensajes", label: "Chat", icon: MessageCircle, requiresAuth: true, badgeKey: "messages" as const },
  { key: "perfil", label: "Perfil", icon: User, requiresAuth: true, badgeKey: "favorites" as const },
];

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string, params?: any) => void;
}

export function MobileNav({ currentPage, onNavigate }: MobileNavProps) {
  const { data: session } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [ripple, setRipple] = useState<string | null>(null);

  // Fetch notification unread count (polls every 30s) — only when authenticated
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
    enabled: !!session,
  });

  // Fetch favorites count for the Perfil tab badge
  const { data: favCount } = useQuery({
    queryKey: ["favorites-count"],
    queryFn: fetchFavoritesCount,
    refetchInterval: 60000,
    enabled: !!session,
  });

  const unread = notifData?.unreadCount || 0;
  const favorites = favCount || 0;

  // Compute badge counts per tab
  const badgeCounts: Record<string, number> = {
    messages: unread,
    favorites,
  };

  // Track visual viewport to detect keyboard open
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const updateHeight = () => {
      setViewportHeight(window.visualViewport!.height);
    };

    updateHeight();
    window.visualViewport!.addEventListener("resize", updateHeight);
    window.visualViewport!.addEventListener("scroll", updateHeight);

    return () => {
      window.visualViewport!.removeEventListener("resize", updateHeight);
      window.visualViewport!.removeEventListener("scroll", updateHeight);
    };
  }, []);

  // Hide on admin, detail pages, or when keyboard is open
  const shouldHide =
    currentPage === "admin" ||
    currentPage === "detail" ||
    (viewportHeight !== null && viewportHeight < 500);

  if (shouldHide) return null;

  // Determine which page is active for each nav item
  const getActiveKey = (key: string) => {
    if (key === "home") return currentPage === "home";
    if (key === "servicios")
      return (
        currentPage === "servicios" ||
        currentPage === "autos" ||
        currentPage === "propiedades"
      );
    return currentPage === key;
  };

  const handleItemClick = (item: (typeof NAV_ITEMS)[number]) => {
    // Ripple effect
    setRipple(item.key);
    setTimeout(() => setRipple(null), 300);

    if (item.requiresAuth && !session) {
      setShowAuth(true);
      return;
    }
    onNavigate(item.key);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[var(--umpi-border)] bg-[var(--umpi-surface)]/98 backdrop-blur-lg shadow-[0_-4px_24px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navegación móvil"
      >
        <div className="flex items-end justify-around h-16 px-1">
          {NAV_ITEMS.map((item) => {
            const isActive = getActiveKey(item.key);
            const Icon = item.icon;
            const badge = item.badgeKey ? badgeCounts[item.badgeKey] || 0 : 0;
            const isRippling = ripple === item.key;

            if (item.isFab) {
              return (
                <button
                  key={item.key}
                  onClick={() => handleItemClick(item)}
                  className="flex flex-col items-center justify-center -mt-5"
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className={`w-14 h-14 rounded-full bg-[var(--umpi-accent)] flex items-center justify-center shadow-[0_4px_16px_rgba(232,76,30,0.35)] ring-4 ring-[var(--umpi-surface)] transition-transform duration-200 active:scale-95 ${isRippling ? "scale-95" : "scale-100"}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] mt-1 font-semibold text-[var(--umpi-accent)]">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl grid place-items-center transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--umpi-accent-soft)]"
                      : ""
                  }`}>
                    <Icon
                      className={`w-5 h-5 transition-all duration-200 ${
                        isActive
                          ? "text-[var(--umpi-accent)]"
                          : "text-[var(--umpi-text3)]"
                      }`}
                    />
                  </div>
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-[var(--umpi-accent)] transition-all duration-200" />
                  )}
                  {badge > 0 && (
                    <span
                      className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[9px] font-bold text-white animate-bounce-in shadow-sm"
                      style={{ background: "var(--umpi-accent)" }}
                      aria-label={`${badge} sin leer`}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] leading-tight transition-colors duration-200 ${
                    isActive
                      ? "text-[var(--umpi-accent)] font-semibold"
                      : "text-[var(--umpi-text3)] font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <AuthModal open={showAuth} onOpenChange={setShowAuth} defaultMode="login" />
    </>
  );
}
