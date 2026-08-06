import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/plans — Lista todos los planes activos, ordenados por `order`.
// Convierte el campo `features` (string JSON) en un array antes de devolverlo.
export async function GET() {
  try {
    const plans = await db.plan.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });

    const parsed = plans.map((p) => {
      let features: string[] = [];
      try {
        features = p.features ? (JSON.parse(p.features) as string[]) : [];
      } catch {
        features = [];
      }
      return {
        ...p,
        features,
      };
    });

    return NextResponse.json({ plans: parsed });
  } catch (err: any) {
    console.error("GET /api/plans error:", err);
    return NextResponse.json({ error: "Error al obtener planes" }, { status: 500 });
  }
}
