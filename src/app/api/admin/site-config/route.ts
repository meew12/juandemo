import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findAllSiteConfig,
  upsertSiteConfig,
  createAuditLog,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    return null;
  }
  return session;
}

// Claves de configuración soportadas y sus valores por defecto.
// Esto documenta qué textos del frontend pueden editarse desde el admin.
export const SITE_CONFIG_DEFAULTS: Record<string, string> = {
  // ─── Hero (home) ───
  "hero.title": "Encontrá lo que buscás, ofrecé lo que hacés",
  "hero.subtitle":
    "El marketplace de servicios, autos y propiedades más grande de Argentina. Conectá con miles de compradores y vendedores verificados.",
  "hero.searchPlaceholder": "¿Qué estás buscando? Ej: Plomero, Toyota Corolla, Departamento...",
  "hero.ctaPrimary": "Publicar gratis",
  "hero.ctaSecondary": "Explorar categorías",

  // ─── Trust badges ───
  "trust.publications": "48.500+",
  "trust.publicationsLabel": "Publicaciones activas",
  "trust.users": "32.000+",
  "trust.usersLabel": "Usuarios activos",
  "trust.rating": "4.8/5",
  "trust.ratingLabel": "Calificación promedio",

  // ─── CTA sección ───
  "cta.title": "¿Listo para empezar?",
  "cta.subtitle":
    "Sumate a miles de argentos que ya están comprando y vendiendo en UMPI. Publicá gratis en 2 minutos.",
  "cta.button": "Publicar ahora",

  // ─── Footer ───
  "footer.tagline":
    "El marketplace argentino para servicios, autos y propiedades. Conectamos compradores y vendedores verificados.",
  "footer.copyright": "UMPI. Todos los derechos reservados.",

  // ─── Newsletter ───
  "newsletter.title": "Recibí las mejores ofertas",
  "newsletter.subtitle": "Suscribite al newsletter y enterate antes que nadie.",
  "newsletter.placeholder": "tu@email.com",
  "newsletter.button": "Suscribirme",

  // ─── Cookies banner ───
  "cookies.message":
    "Usamos cookies para mejorar tu experiencia. Al continuar navegando, aceptás nuestra política de cookies.",
  "cookies.accept": "Aceptar",
  "cookies.decline": "Rechazar",
  "cookies.learnMore": "Saber más",

  // ─── Mensajes generales ───
  "general.brandName": "UMPI",
  "general.supportEmail": "soporte@umpi.com.ar",
  "general.supportPhone": "+54 11 5555-5555",
  "general.supportWhatsapp": "+54 9 11 5555-5555",
};

// ─── GET /api/admin/site-config ───
// Devuelve todas las claves de configuración con fallback a defaults.
export async function GET() {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const rows = await findAllSiteConfig();
    const map: Record<string, string> = { ...SITE_CONFIG_DEFAULTS };
    rows.forEach((r) => {
      map[r.key] = r.value;
    });

    // Devolver agrupado por sección para la UI
    const grouped: Record<string, { key: string; label: string; value: string }[]> = {
      "Hero (Inicio)": [
        { key: "hero.title", label: "Título principal", value: map["hero.title"] },
        { key: "hero.subtitle", label: "Subtítulo", value: map["hero.subtitle"] },
        { key: "hero.searchPlaceholder", label: "Placeholder del buscador", value: map["hero.searchPlaceholder"] },
        { key: "hero.ctaPrimary", label: "Botón primario", value: map["hero.ctaPrimary"] },
        { key: "hero.ctaSecondary", label: "Botón secundario", value: map["hero.ctaSecondary"] },
      ],
      "Indicadores de confianza": [
        { key: "trust.publications", label: "Cantidad de publicaciones", value: map["trust.publications"] },
        { key: "trust.publicationsLabel", label: "Texto publicaciones", value: map["trust.publicationsLabel"] },
        { key: "trust.users", label: "Cantidad de usuarios", value: map["trust.users"] },
        { key: "trust.usersLabel", label: "Texto usuarios", value: map["trust.usersLabel"] },
        { key: "trust.rating", label: "Calificación", value: map["trust.rating"] },
        { key: "trust.ratingLabel", label: "Texto calificación", value: map["trust.ratingLabel"] },
      ],
      "Sección CTA": [
        { key: "cta.title", label: "Título", value: map["cta.title"] },
        { key: "cta.subtitle", label: "Subtítulo", value: map["cta.subtitle"] },
        { key: "cta.button", label: "Botón", value: map["cta.button"] },
      ],
      Footer: [
        { key: "footer.tagline", label: "Descripción", value: map["footer.tagline"] },
        { key: "footer.copyright", label: "Copyright", value: map["footer.copyright"] },
      ],
      Newsletter: [
        { key: "newsletter.title", label: "Título", value: map["newsletter.title"] },
        { key: "newsletter.subtitle", label: "Subtítulo", value: map["newsletter.subtitle"] },
        { key: "newsletter.placeholder", label: "Placeholder email", value: map["newsletter.placeholder"] },
        { key: "newsletter.button", label: "Botón", value: map["newsletter.button"] },
      ],
      "Banner de cookies": [
        { key: "cookies.message", label: "Mensaje", value: map["cookies.message"] },
        { key: "cookies.accept", label: "Botón aceptar", value: map["cookies.accept"] },
        { key: "cookies.decline", label: "Botón rechazar", value: map["cookies.decline"] },
        { key: "cookies.learnMore", label: "Link saber más", value: map["cookies.learnMore"] },
      ],
      "Datos de contacto": [
        { key: "general.brandName", label: "Nombre de marca", value: map["general.brandName"] },
        { key: "general.supportEmail", label: "Email soporte", value: map["general.supportEmail"] },
        { key: "general.supportPhone", label: "Teléfono soporte", value: map["general.supportPhone"] },
        { key: "general.supportWhatsapp", label: "WhatsApp", value: map["general.supportWhatsapp"] },
      ],
    };

    return NextResponse.json({
      config: grouped,
      raw: map,
    });
  } catch (err: any) {
    console.error("GET /api/admin/site-config error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── PUT /api/admin/site-config ───
// Recibe { updates: { "hero.title": "Nuevo título", ... } } y actualiza/crea en DB.
export async function PUT(req: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { updates } = (await req.json()) as { updates: Record<string, string> };
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Falta updates" }, { status: 400 });
    }

    // Filtrar solo claves válidas
    const validKeys = Object.keys(SITE_CONFIG_DEFAULTS);
    const entries = Object.entries(updates).filter(([k]) => validKeys.includes(k));

    if (entries.length === 0) {
      return NextResponse.json({ error: "No hay claves válidas para actualizar" }, { status: 400 });
    }

    // Upsert cada una (SQLite ON CONFLICT)
    await Promise.all(
      entries.map(([key, value]) => upsertSiteConfig(key, String(value)))
    );

    await createAuditLog({
      userId: session.user.id,
      action: "site_config_update",
      entity: "site_config",
      entityId: null,
      details: JSON.stringify({ keys: entries.map(([k]) => k) }),
    });

    return NextResponse.json({ success: true, updated: entries.length });
  } catch (err: any) {
    console.error("PUT /api/admin/site-config error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
