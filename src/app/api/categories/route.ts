import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const where: any = {};
    if (type) where.type = type;

    const categories = await db.category.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ categories });
  } catch (err: any) {
    console.error("GET /api/categories error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
