import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findUsers,
  countUsers,
  listingCountBySeller,
  updateUser,
  createAuditLog,
  type UserListFilter,
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
    const q = searchParams.get("q") || "";
    const role = searchParams.get("role"); // user | admin
    const plan = searchParams.get("plan"); // basico | pro | business
    const verified = searchParams.get("verified"); // "true" | "false"
    const status = searchParams.get("status"); // active | banned
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "10"));
    const offset = (page - 1) * pageSize;

    const filter: UserListFilter = {};
    if (q) filter.q = q;
    if (role) filter.role = role;
    if (plan) filter.plan = plan;
    if (verified === "true") filter.verified = true;
    if (verified === "false") filter.verified = false;
    if (status === "banned") filter.banned = true;
    if (status === "active") filter.banned = false;

    const [users, total] = await Promise.all([
      findUsers(filter, { orderBy: "createdAt DESC", limit: pageSize, offset }),
      countUsers(filter),
    ]);

    const sellerIds = users.map((u) => u.id);
    const countMap = await listingCountBySeller(sellerIds);

    const usersWithCounts = users.map((u) => {
      // Exclude passwordHash from the response
      const { passwordHash: _omit, ...safeUser } = u;
      return {
        ...safeUser,
        name: [u.name, u.lastName].filter(Boolean).join(" ") || "Usuario",
        initials: u.avatarInitials || "U",
        listingsCount: countMap.get(u.id) || 0,
        memberSince: u.memberSince,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({
      users: usersWithCounts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { userId, action, role, plan } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    }

    const data: Parameters<typeof updateUser>[1] = {};
    let actionLabel = "";

    if (action === "ban") {
      data.banned = true;
      actionLabel = "user_ban";
    } else if (action === "unban") {
      data.banned = false;
      actionLabel = "user_unban";
    } else if (action === "verify") {
      data.verified = true;
      actionLabel = "user_verify";
    } else if (action === "unverify") {
      data.verified = false;
      actionLabel = "user_unverify";
    } else if (action === "setRole" && role) {
      data.role = role;
      actionLabel = "user_role_change";
    } else if (action === "setPlan" && plan) {
      data.plan = plan;
      actionLabel = "user_plan_change";
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const updated = await updateUser(userId, data);
    if (!updated) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await createAuditLog({
      userId: session.user.id,
      action: actionLabel,
      entity: "user",
      entityId: userId,
      details: JSON.stringify({ action, role, plan }),
    });

    // Exclude passwordHash from the response
    const { passwordHash: _omit, ...safeUpdated } = updated;

    return NextResponse.json({
      user: {
        ...safeUpdated,
        name: [updated.name, updated.lastName].filter(Boolean).join(" ") || "Usuario",
        initials: updated.avatarInitials || "U",
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/admin/users error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
