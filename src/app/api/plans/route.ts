import { NextResponse } from "next/server";
import { findActivePlans, safeJsonParse } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/plans — Lista todos los planes activos, ordenados por `order`.
// Convierte el campo `features` (string JSON) en un array antes de devolverlo.
export async function GET() {
  try {
    const plans = await findActivePlans();

    const parsed = plans.map((p) => ({
      ...p,
      features: safeJsonParse<string[]>(p.features, []),
    }));

    return NextResponse.json({ plans: parsed });
  } catch (err: any) {
    console.error("GET /api/plans error:", err);
    return NextResponse.json({ error: "Error al obtener planes" }, { status: 500 });
  }
}
