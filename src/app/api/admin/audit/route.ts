import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const where: any = {};
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ]);

    // Hydrate users manually since AuditLog has no relation to User
    const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean))) as string[];
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            avatarInitials: true,
            role: true,
          },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const result = logs.map((l) => {
      const u = l.userId ? userMap.get(l.userId) : null;
      return {
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        details: l.details,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
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
