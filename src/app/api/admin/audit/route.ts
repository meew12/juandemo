import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAuditLogs, countAuditLogs, getUserById } from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "50"));
    const offset = (page - 1) * pageSize;

    const filter: { action?: string } = {};
    if (action) filter.action = action;

    const [logs, total] = await Promise.all([
      findAuditLogs(filter, { limit: pageSize, offset }),
      countAuditLogs(filter),
    ]);

    // Hydrate users manually since AuditLog has no relation to User
    const userIds = Array.from(
      new Set(logs.map((l) => l.userId).filter((id): id is string => Boolean(id)))
    );
    const users = userIds.length
      ? await Promise.all(userIds.map((id) => getUserById(id)))
      : [];
    const userMap = new Map(
      users
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map((u) => [u.id, u])
    );

    const result = logs.map((l) => {
      const u = l.userId ? userMap.get(l.userId) : null;
      return {
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        details: l.details,
        ip: l.ip,
        createdAt: l.createdAt,
        user: u
          ? {
              id: u.id,
              name: [u.name, u.lastName].filter(Boolean).join(" ") || "Usuario",
              email: u.email,
              initials: u.avatarInitials || "U",
              role: u.role,
            }
          : null,
      };
    });

    return NextResponse.json({
      logs: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("GET /api/admin/audit error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
