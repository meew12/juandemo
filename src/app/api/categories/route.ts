import { NextResponse } from "next/server";
import { findCategories } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const categories = await findCategories(type ? { type } : {});

    return NextResponse.json({ categories });
  } catch (err: any) {
    console.error("GET /api/categories error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
