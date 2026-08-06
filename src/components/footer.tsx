"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSiteConfig } from "@/hooks/use-site-config";
import {
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  Headphones,
  LayoutList,
  Star,
  ArrowRight,
  Lock,
} from "lucide-react";

export function Footer({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [email, setEmail] = useState("");
  const { get } = useSiteConfig();

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("¡Te suscribiste al newsletter de UMPI! 📬");
    setEmail("");
  };

  return (
    <footer className="bg-[var(--umpi-surface)] dark:bg-[#0f0d0a] border-t border-[var(--umpi-border)] mt-auto pb-28 sm:pb-24">
      {/* CTA Banner */}
      <div
        className="text-white px-4 sm:px-6 py-8"
        style={{
          background:
            "linear-gradient(90deg, var(--umpi-accent) 0%, var(--umpi-accent2) 100%)",
        }}
      >
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="font-display text-xl sm:text-2xl mb-1">
              ¿Todavía no publicaste tu aviso?
            </h3>
            <p className="text-white/90 text-sm">
              Publicá gratis y llegá a miles de clientes en toda Argentina
            </p>
          </div>
          <Button
            onClick={() => onNavigate("publicar")}
            className="bg-white text-[var(--umpi-accent)] hover:bg-white/90 font-semibold px-6 h-11 gap-2 rounded-full"
          >
            Publicar gratis
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="grid place-items-center text-white font-display"
                style={{ width: 40, height: 40, background: "var(--umpi-accent)", borderRadius: 12, fontSize: 22 }}
              >
                U
              </div>
              <span
                className="font-bold text-xl"
                style={{ fontFamily: "var(--font-sora)", fontWeight: 700, letterSpacing: "-0.5px" }}
              >
                UMP<span style={{ color: "var(--umpi-accent)" }}>I</span>
              </span>
            </div>
            <p className="text-sm text-[var(--umpi-text2)] mb-4 max-w-xs leading-relaxed">
              {get(
                "footer.tagline",
                "El marketplace de Argentina. Servicios, autos y propiedades en un solo lugar. Conectá con miles de vendedores verificados."
              )}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <a
                href="#"
                className="w-8 h-8 grid place-items-center rounded-lg bg-[var(--umpi-surface2)] hover:bg-[var(--umpi-accent)] hover:text-white text-[var(--umpi-text2)] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 grid place-items-center rounded-lg bg-[var(--umpi-surface2)] hover:bg-[var(--umpi-accent)] hover:text-white text-[var(--umpi-text2)] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 grid place-items-center rounded-lg bg-[var(--umpi-surface2)] hover:bg-[var(--umpi-accent)] hover:text-white text-[var(--umpi-text2)] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 grid place-items-center rounded-lg bg-[var(--umpi-surface2)] hover:bg-[var(--umpi-accent)] hover:text-white text-[var(--umpi-text2)] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 grid place-items-center rounded-lg bg-[var(--umpi-surface2)] hover:bg-[var(--umpi-accent)] hover:text-white text-[var(--umpi-text2)] transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 rounded bg-[var(--umpi-surface2)] text-[10px] text-[var(--umpi-text2)] font-medium">
                🍎 App Store
              </div>
              <div className="px-2 py-1 rounded bg-[var(--umpi-surface2)] text-[10px] text-[var(--umpi-text2)] font-medium">
                ▶ Google Play
              </div>
            </div>
          </div>

          {/* Explorar */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[var(--umpi-text)]">Explorar</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate("servicios")} className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">
                  Servicios profesionales
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("autos")} className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">
                  Autos y vehículos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("propiedades")} className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">
                  Propiedades
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("suscripciones")} className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors flex items-center gap-1">
                  <Star className="w-3 h-3" /> UMPI Premium
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("publicar")} className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">
                  Publicar aviso
                </button>
              </li>
              <li>
                <a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">
                  Mapa del sitio
                </a>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[var(--umpi-text)]">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Quiénes somos</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Blog y novedades</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Prensa</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Empleos en UMPI</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Inversores</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Responsabilidad social</a></li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[var(--umpi-text)]">Soporte</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Centro de ayuda</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Cómo vender en UMPI</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Política de seguridad</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Contacto y soporte</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Reportar un problema</a></li>
              <li><a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)] transition-colors">Estado del sistema</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 lg:col-span-1">
            <h4 className="font-semibold text-sm mb-3 text-[var(--umpi-text)]">Newsletter</h4>
            <p className="text-xs text-[var(--umpi-text2)] mb-3">
              {get("newsletter.subtitle", "Recibí las mejores ofertas y novedades en tu email.")}
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-1">
              <Input
                type="email"
                placeholder={get("newsletter.placeholder", "tu@email.com")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm bg-[var(--umpi-surface2)] border-[var(--umpi-border)]"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white h-9 px-3"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-[10px] text-[var(--umpi-text3)] mt-2">
              Al suscribirte aceptás recibir emails de UMPI.
            </p>
          </div>
        </div>

        {/* Payment methods & Security */}
        <div className="mt-8 pt-6 border-t border-[var(--umpi-border)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Payment methods */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--umpi-text3)] mb-3">Métodos de pago</h4>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--umpi-surface2)] border border-[var(--umpi-border)] text-xs font-semibold text-[var(--umpi-text2)]">
                  <CreditCard className="w-3.5 h-3.5 text-[var(--umpi-blue)]" />
                  Mercado Pago
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--umpi-surface2)] border border-[var(--umpi-border)] text-xs font-semibold text-[var(--umpi-text2)]">
                  <span className="text-[var(--umpi-blue)] font-bold">VISA</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--umpi-surface2)] border border-[var(--umpi-border)] text-xs font-semibold text-[var(--umpi-text2)]">
                  <span className="text-[var(--umpi-accent)] font-bold">MC</span>
                  Mastercard
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--umpi-surface2)] border border-[var(--umpi-border)] text-xs font-semibold text-[var(--umpi-text2)]">
                  Transferencia
                </div>
              </div>
            </div>
            {/* Security */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--umpi-text3)] mb-3">Seguridad</h4>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--umpi-green-soft)] border border-[var(--umpi-green)]/20 w-fit">
                <Lock className="w-4 h-4 text-[var(--umpi-green)]" />
                <span className="text-xs font-semibold text-[var(--umpi-green)]">Tus datos están protegidos</span>
              </div>
              <p className="text-[11px] text-[var(--umpi-text3)] mt-2 max-w-sm">
                Encriptación SSL de 256 bits. Transacciones protegidas por Mercado Pago.
              </p>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="pt-6 border-t border-[var(--umpi-border)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--umpi-green)] shrink-0" />
              <span className="text-xs text-[var(--umpi-text2)]">Pagos 100% seguros</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-[var(--umpi-green)] shrink-0" />
              <span className="text-xs text-[var(--umpi-text2)]">Vendedores verificados</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--umpi-blue)] shrink-0" />
              <span className="text-xs text-[var(--umpi-text2)]">Mercado Pago y tarjetas</span>
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[var(--umpi-accent)] shrink-0" />
              <span className="text-xs text-[var(--umpi-text2)]">Soporte 24/7</span>
            </div>
            <div className="flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-[var(--umpi-gold)] shrink-0" />
              <span className="text-xs text-[var(--umpi-text2)]">+48.000 publicaciones</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--umpi-gold)] shrink-0" />
              <span className="text-xs text-[var(--umpi-text2)]">Calificación 4.8/5</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-6 border-t border-[var(--umpi-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--umpi-text2)]">
            {(() => {
              const raw = get("footer.copyright", "UMPI S.A.S.");
              const year = new Date().getFullYear();
              // Si el valor de DB no incluye el sufijo "Hecho con...", lo appendamos
              // para mantener el tono de marca argentino.
              const hasHechoSuffix = /hecho\s+con/i.test(raw);
              return `© ${year} ${raw}${hasHechoSuffix ? "" : " — Hecho con ❤️ en 🇦🇷 Argentina"}`;
            })()}
          </p>
          <div className="flex items-center gap-4 text-xs">
            <a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] transition-colors">Términos</a>
            <a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] transition-colors">Privacidad</a>
            <a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] transition-colors">Cookies</a>
            <a href="#" className="text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] transition-colors">Aviso legal</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
