import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findReports,
  countReports,
  getReportById,
  updateReport,
  updateUser,
  createAuditLog,
  getUserById,
  getListingById,
} from "@/lib/db-raw";

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
    const status = searchParams.get("status"); // open | reviewing | resolved | dismissed
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));
    const offset = (page - 1) * pageSize;

    const filter: { status?: string } = {};
    if (status) filter.status = status;

    const [reports, total, openCount] = await Promise.all([
      findReports(filter, { limit: pageSize, offset }),
      countReports(filter),
      countReports({ status: "open" }),
    ]);

    // Collect unique ids for batched hydration
    const userIds = new Set<string>();
    const listingIds = new Set<string>();
    for (const r of reports) {
      if (r.reporterId) userIds.add(r.reporterId);
      if (r.reportedUserId) userIds.add(r.reportedUserId);
      if (r.listingId) listingIds.add(r.listingId);
    }

    const [userList, listingList] = await Promise.all([
      Promise.all(Array.from(userIds).map((id) => getUserById(id))),
      Promise.all(Array.from(listingIds).map((id) => getListingById(id))),
    ]);

    const userMap = new Map<string, NonNullable<Awaited<ReturnType<typeof getUserById>>>>();
    userList.forEach((u) => {
      if (u) userMap.set(u.id, u);
    });

    const listingMap = new Map<
      string,
      NonNullable<Awaited<ReturnType<typeof getListingById>>>
    >();
    listingList.forEach((l) => {
      if (l) listingMap.set(l.id, l);
    });

    const mapUser = (id: string | null) => {
      if (!id) return null;
      const u = userMap.get(id);
      if (!u) return null;
      return {
        id: u.id,
        name: [u.name, u.lastName].filter(Boolean).join(" ") || "Usuario",
        email: u.email,
        initials: u.avatarInitials || "U",
      };
    };

    const result = reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt,
      reporter: mapUser(r.reporterId || null),
      reportedUser: mapUser(r.reportedUserId),
      listing: r.listingId
        ? (() => {
            const l = listingMap.get(r.listingId);
            if (!l) return null;
            return { id: l.id, title: l.title, slug: l.slug, status: l.status };
          })()
        : null,
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
      const report = await getReportById(reportId);
      if (report?.reportedUserId) {
        await updateUser(report.reportedUserId, { banned: true });
        await createAuditLog({
          userId: session.user.id,
          action: "user_ban",
          entity: "user",
          entityId: report.reportedUserId,
          details: JSON.stringify({ from: "report", reportId }),
        });
      }
      newStatus = "resolved";
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const updated = await updateReport(reportId, {
      status: newStatus,
      resolution: resolution || null,
    });

    await createAuditLog({
      userId: session.user.id,
      action: `report_${action}`,
      entity: "report",
      entityId: reportId,
      details: JSON.stringify({ status: newStatus, resolution }),
    });

    return NextResponse.json({ report: updated });
  } catch (err: any) {
    console.error("PATCH /api/admin/reports error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
