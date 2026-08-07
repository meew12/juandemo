"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Facebook, Twitter, MessageCircle, Mail, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Listing } from "@/lib/types";

export function ShareButton({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/?page=detail&slug=${listing.slug}`
    : "";
  const shareText = `Mirá esta publicación en UMPI: ${listing.title}`;
  const sharePrice = listing.price ? ` - $${listing.price.toLocaleString("es-AR")}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado al portapapeles 📋");
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Link copiado 📋");
    }
    setOpen(false);
  };

  const shareOptions = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      color: "#25D366",
      onClick: () => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(shareText + sharePrice + " " + shareUrl)}`,
          "_blank"
        );
        setOpen(false);
      },
    },
    {
      label: "Facebook",
      icon: Facebook,
      color: "#1877F2",
      onClick: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank"
        );
        setOpen(false);
      },
    },
    {
      label: "Twitter / X",
      icon: Twitter,
      color: "#000000",
      onClick: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          "_blank"
        );
        setOpen(false);
      },
    },
    {
      label: "Email",
      icon: Mail,
      color: "#EA4335",
      onClick: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareText + sharePrice + "\n\n" + shareUrl)}`;
        setOpen(false);
      },
    },
  ];

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="hover:bg-[var(--umpi-surface2)]"
        aria-label="Compartir"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl shadow-[0_24px_64px_rgba(26,22,18,0.16)] z-50 animate-slide-up overflow-hidden">
          <div className="p-3 border-b border-[var(--umpi-border)]">
            <p className="text-xs font-semibold text-[var(--umpi-text2)] uppercase tracking-wide">
              Compartir publicación
            </p>
          </div>
          <div className="p-2">
            {shareOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--umpi-surface2)] transition-colors text-left"
              >
                <opt.icon className="w-4 h-4" style={{ color: opt.color }} />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
            <div className="h-px bg-[var(--umpi-border)] my-1" />
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--umpi-surface2)] transition-colors text-left"
            >
              <Link2 className="w-4 h-4 text-[var(--umpi-accent)]" />
              <span className="text-sm font-medium">Copiar link</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
