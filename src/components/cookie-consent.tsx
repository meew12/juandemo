"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { useSiteConfig } from "@/hooks/use-site-config";

const CONSENT_KEY = "umpi-cookies-consent";

type ConsentValue = "all" | "necessary" | null;

function getStoredConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CONSENT_KEY) as ConsentValue;
  } catch {
    return null;
  }
}

function setStoredConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      localStorage.setItem(CONSENT_KEY, value);
    } else {
      localStorage.removeItem(CONSENT_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { get } = useSiteConfig();

  // Mensaje de cookies: si contiene la frase "política de cookies", la wrap-eamos
  // en un span con estilo de link para mantener el diseño original.
  const cookieMessage = get(
    "cookies.message",
    "Utilizamos cookies para mejorar tu experiencia en UMPI. Al continuar navegando, aceptás nuestra política de cookies."
  );
  const cookieMessageParts = cookieMessage.split(/(política de cookies|politica de cookies)/i);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Small delay so the page loads first, then the banner slides in
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);



  const handleAccept = () => {
    setStoredConsent("all");
    setVisible(false);
  };

  const handleNecessary = () => {
    setStoredConsent("necessary");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[80] p-3 sm:p-4 animate-slide-up"
      role="dialog"
      aria-label="Aviso de cookies"
      aria-labelledby="umpi-cookie-title"
    >
      <div className="relative w-full max-w-3xl mx-auto bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl p-4 sm:p-5 shadow-[0_24px_64px_rgba(26,22,18,0.32)] flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Close (X) button top-right */}
        <button
          onClick={handleNecessary}
          aria-label="Cerrar aviso de cookies"
          className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full text-[var(--umpi-text3)] hover:bg-[var(--umpi-surface2)] hover:text-[var(--umpi-text)] transition-colors sm:hidden"
        >
          <Cookie className="w-3.5 h-3.5" />
        </button>
        {/* Icon + Text */}
        <div className="flex items-start gap-3 flex-1">
          <div
            className="shrink-0 grid place-items-center rounded-xl"
            style={{
              width: 44,
              height: 44,
              background: "var(--umpi-accent-soft)",
            }}
          >
            <Cookie className="w-5 h-5" style={{ color: "var(--umpi-accent)" }} />
          </div>
          <div>
            <p
              id="umpi-cookie-title"
              className="text-sm font-semibold mb-0.5"
              style={{ color: "var(--umpi-text)" }}
            >
              Tu privacidad es importante
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--umpi-text2)" }}>
              {cookieMessageParts.length === 3 ? (
                <>
                  {cookieMessageParts[0]}
                  <span
                    className="font-medium underline cursor-pointer"
                    style={{ color: "var(--umpi-accent)" }}
                  >
                    {cookieMessageParts[1]}
                  </span>
                  {cookieMessageParts[2]}
                </>
              ) : (
                cookieMessage
              )}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNecessary}
            className="flex-1 sm:flex-none rounded-full text-sm border-[var(--umpi-border)] text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)] hover:text-[var(--umpi-text)]"
          >
            {get("cookies.decline", "Solo necesarias")}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="flex-1 sm:flex-none rounded-full text-sm text-white shadow-[0_4px_14px_rgba(232,76,30,0.35)]"
            style={{ background: "var(--umpi-accent)" }}
          >
            {get("cookies.accept", "Aceptar todas")}
          </Button>
        </div>
      </div>
    </div>
  );
}
