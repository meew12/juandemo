import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findNotificationsByUser,
  countNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  execute,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      findNotificationsByUser(session.user.id, { limit: 20 }),
      countNotifications(session.user.id, true),
    ]);

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
      await markAllNotificationsRead(session.user.id);
      return NextResponse.json({ success: true });
    }

    if (action === "markRead" && id) {
      await markNotificationRead(id);
      return NextResponse.json({ success: true });
    }

    if (action === "clearAll") {
      await execute(`DELETE FROM Notification WHERE userId = ?`, [
        session.user.id,
      ]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
