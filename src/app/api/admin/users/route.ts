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
    const q = searchParams.get("q") || "";
    const role = searchParams.get("role"); // user | admin
    const plan = searchParams.get("plan"); // basico | pro | business
    const verified = searchParams.get("verified"); // "true" | "false"
    const status = searchParams.get("status"); // active | banned
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "10"));
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
      ];
    }
    if (role) where.role = role;
    if (plan) where.plan = plan;
    if (verified === "true") where.verified = true;
    if (verified === "false") where.verified = false;
    if (status === "banned") where.banned = true;
    if (status === "active") where.banned = false;

    const [users, total, listingCounts] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: offset,
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          avatarInitials: true,
          image: true,
          role: true,
          plan: true,
          verified: true,
          banned: true,
          zone: true,
          memberSince: true,
          createdAt: true,
        },
      }),
      db.user.count({ where }),
      db.listing.groupBy({
        by: ["sellerId"],
        where: { sellerId: { in: (await db.user.findMany({ where, select: { id: true } })).map((u) => u.id) } },
        _count: { _all: true },
      }),
    ]);

    const countMap = new Map<string, number>();
    listingCounts.forEach((lc) => countMap.set(lc.sellerId, lc._count._all));

    const usersWithCounts = users.map((u) => ({
      ...u,
      name: [u.name, u.lastName].filter(Boolean).join(" ") || "Usuario",
      initials: u.avatarInitials || "U",
      listingsCount: countMap.get(u.id) || 0,
      memberSince: u.memberSince.toISOString(),
      createdAt: u.createdAt.toISOString(),
    }));

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

    const data: any = {};
    const actionLabel: string[] = [];

    if (action === "ban") {
      data.banned = true;
      actionLabel.push("user_ban");
    } else if (action === "unban") {
      data.banned = false;
      actionLabel.push("user_unban");
    } else if (action === "verify") {
      data.verified = true;
      actionLabel.push("user_verify");
    } else if (action === "unverify") {
      data.verified = false;
      actionLabel.push("user_unverify");
    } else if (action === "setRole" && role) {
      data.role = role;
      actionLabel.push("user_role_change");
    } else if (action === "setPlan" && plan) {
      data.plan = plan;
      actionLabel.push("user_plan_change");
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        avatarInitials: true,
        role: true,
        plan: true,
        verified: true,
        banned: true,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: actionLabel[0],
        entity: "user",
        entityId: userId,
        details: JSON.stringify({ action, role, plan }),
      },
    });

    return NextResponse.json({
      user: {
        ...updated,
        name: [updated.name, updated.lastName].filter(Boolean).join(" ") || "Usuario",
        initials: updated.avatarInitials || "U",
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/admin/users error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
