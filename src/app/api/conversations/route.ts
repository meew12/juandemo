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

    const conversations = await db.conversation.findMany({
      where: { participants: { some: { id: session.user.id } } },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarInitials: true,
            verified: true,
          },
        },
        listing: {
          select: { id: true, slug: true, title: true, price: true, currency: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Get unread counts
    const withUnread = await Promise.all(
      conversations.map(async (c) => {
        const unread = await db.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: session.user.id },
            read: false,
          },
        });
        return { ...c, unreadCount: unread };
      })
    );

    return NextResponse.json({ conversations: withUnread });
  } catch (err: any) {
    console.error("GET /api/conversations error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { listingId, sellerId } = await req.json();

    // Find or create conversation
    let conversation;
    if (listingId) {
      conversation = await db.conversation.findFirst({
        where: {
          listingId,
          participants: { some: { id: session.user.id } },
        },
        include: { participants: true },
      });
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          listingId: listingId || null,
          participants: {
            connect: [{ id: session.user.id }, { id: sellerId }],
          },
        },
        include: { participants: true },
      });
    }

    return NextResponse.json({ conversation });
  } catch (err: any) {
    console.error("POST /api/conversations error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
