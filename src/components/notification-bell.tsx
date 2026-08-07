"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2, MessageCircle, Star, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";

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

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  message: MessageCircle,
  review: Star,
  boost: Sparkles,
  subscription: Sparkles,
  system: Bell,
  favorite: Star,
};

export function NotificationBell() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);
  const prevUnreadRef = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Poll every 30s
  });

  const unread = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  // Pulse animation when new notifications arrive
  useEffect(() => {
    if (unread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      // Defer setState to avoid synchronous setState in effect
      const t1 = setTimeout(() => setShouldPulse(true), 0);
      const t2 = setTimeout(() => setShouldPulse(false), 2000);
      prevUnreadRef.current = unread;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevUnreadRef.current = unread;
  }, [unread]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearAll" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleClick = (notif: Notification) => {
    // Mark as read
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", id: notif.id }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    if (notif.link) {
      setOpen(false);
      router.push(notif.link);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative w-9 h-9 grid place-items-center rounded-full hover:bg-[var(--umpi-surface2)] transition-colors ${
          shouldPulse ? "animate-pulse" : ""
        }`}
        aria-label="Notificaciones"
      >
        <Bell className="w-4 h-4 text-[var(--umpi-text2)]" />
        {unread > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full text-[10px] font-bold text-white animate-fade-in ${
              shouldPulse ? "animate-bounce" : ""
            }`}
            style={{ background: "var(--umpi-accent)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl shadow-[0_24px_64px_rgba(26,22,18,0.16)] z-50 animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--umpi-border)]">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notificaciones</h3>
              {unread > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] font-medium">
                  {unread} sin leer
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[10px] px-2 py-1 rounded text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent-soft)] transition-colors flex items-center gap-1"
                  title="Marcar todas como leídas"
                >
                  <Check className="w-3 h-3" />
                  Marcar leídas
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAll.mutate()}
                  className="text-[10px] px-2 py-1 rounded text-[var(--umpi-text3)] hover:bg-[var(--umpi-surface2)] transition-colors"
                  title="Borrar todas"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-[var(--umpi-text3)] mx-auto mb-2" />
                <p className="text-sm text-[var(--umpi-text2)]">No tenés notificaciones</p>
                <p className="text-xs text-[var(--umpi-text3)] mt-1">
                  Te avisaremos cuando haya novedades
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = NOTIFICATION_ICONS[notif.type] || Bell;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full flex gap-3 p-3 border-b border-[var(--umpi-border)] last:border-0 hover:bg-[var(--umpi-surface2)] transition-colors text-left ${
                      !notif.read ? "bg-[var(--umpi-accent-soft)]/50" : ""
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full grid place-items-center shrink-0"
                      style={{
                        background: notif.read ? "var(--umpi-surface2)" : "var(--umpi-accent-soft)",
                        color: notif.read ? "var(--umpi-text3)" : "var(--umpi-accent)",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${notif.read ? "text-[var(--umpi-text2)]" : "text-[var(--umpi-text)]"}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-[var(--umpi-text2)] line-clamp-2 mt-0.5">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-[var(--umpi-text3)] mt-1">
                        {timeAgoShort(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-[var(--umpi-accent)] shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgoShort(dateStr: string): string {
  const d = new Date(dateStr);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "ahora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `hace ${weeks}sem`;
  const months = Math.floor(days / 30);
  return `hace ${months}mes`;
}
