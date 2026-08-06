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
    const status = searchParams.get("status"); // open | reviewing | resolved | dismissed
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (status) where.status = status;

    const [reports, total, openCount] = await Promise.all([
      db.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              avatarInitials: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              avatarInitials: true,
            },
          },
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },
        },
      }),
      db.report.count({ where }),
      db.report.count({ where: { status: "open" } }),
    ]);

    const result = reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt.toISOString(),
      reporter: r.reporter
        ? {
            id: r.reporter.id,
            name: [r.reporter.name, r.reporter.lastName].filter(Boolean).join(" ") || "Usuario",
            email: r.reporter.email,
            initials: r.reporter.avatarInitials || "U",
          }
        : null,
      reportedUser: r.reportedUser
        ? {
            id: r.reportedUser.id,
            name: [r.reportedUser.name, r.reportedUser.lastName].filter(Boolean).join(" ") || "Usuario",
            email: r.reportedUser.email,
            initials: r.reportedUser.avatarInitials || "U",
          }
        : null,
      listing: r.listing,
    }));

    return NextResponse.json({
      reports: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      openCount,
    });
  } catch (err: any) {
    console.error("GET /api/admin/reports error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { reportId, action, resolution } = await req.json();
    if (!reportId) {
      return NextResponse.json({ error: "Falta reportId" }, { status: 400 });
    }

    let newStatus = "";
    if (action === "review") newStatus = "reviewing";
    else if (action === "resolve") newStatus = "resolved";
    else if (action === "dismiss") newStatus = "dismissed";
    else if (action === "ban_user") {
      // Ban the reported user
      const report = await db.report.findUnique({
        where: { id: reportId },
        select: { reportedUserId: true },
      });
      if (report?.reportedUserId) {
        await db.user.update({
          where: { id: report.reportedUserId },
          data: { banned: true },
        });
        await db.auditLog.create({
          data: {
            userId: session.user.id,
            action: "user_ban",
            entity: "user",
            entityId: report.reportedUserId,
            details: JSON.stringify({ from: "report", reportId }),
          },
        });
      }
      newStatus = "resolved";
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const updated = await db.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        resolution: resolution || null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: `report_${action}`,
        entity: "report",
        entityId: reportId,
        details: JSON.stringify({ status: newStatus, resolution }),
      },
    });

    return NextResponse.json({ report: updated });
  } catch (err: any) {
    console.error("PATCH /api/admin/reports error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
