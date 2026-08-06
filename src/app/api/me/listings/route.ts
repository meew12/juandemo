import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const listings = await db.listing.findMany({
      where: { sellerId: session.user.id },
      include: {
        category: { select: { slug: true, name: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ listings });
  } catch (err: any) {
    console.error("GET /api/me/listings error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
