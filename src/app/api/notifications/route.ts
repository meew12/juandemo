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

    const notifications = await db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = await db.notification.count({
      where: { userId: session.user.id, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { action, id } = body;

    if (action === "markAllRead") {
      await db.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "markRead" && id) {
      await db.notification.update({
        where: { id },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "clearAll") {
      await db.notification.deleteMany({
        where: { userId: session.user.id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
