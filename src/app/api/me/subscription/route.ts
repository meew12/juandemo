import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findSubscriptions, findTransactions } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // findSubscriptions orders by createdAt DESC, so subs[0] is the latest.
    const [subs, transactions] = await Promise.all([
      findSubscriptions(
        { userId: session.user.id, status: "active" },
        { limit: 1 }
      ),
      findTransactions({ userId: session.user.id }, { limit: 10 }),
    ]);

    const subscription = subs.length > 0 ? subs[0] : null;

    return NextResponse.json({ subscription, transactions });
  } catch (err: any) {
    console.error("GET /api/me/subscription error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
