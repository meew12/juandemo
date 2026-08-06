import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SITE_CONFIG_DEFAULTS } from "@/app/api/admin/site-config/route";

// Endpoint público — cualquier usuario (incluido no logueado) puede leer la config.
// Devuelve un mapa { key: value } con valores de DB o defaults.
export async function GET() {
  try {
    const rows = await db.siteConfig.findMany();
    const map: Record<string, string> = { ...SITE_CONFIG_DEFAULTS };
    rows.forEach((r) => {
      map[r.key] = r.value;
    });
    return NextResponse.json({ config: map });
  } catch (err: any) {
    console.error("GET /api/site-config error:", err);
    // En caso de error, devolver defaults para no romper el frontend
    return NextResponse.json({ config: SITE_CONFIG_DEFAULTS });
  }
}
