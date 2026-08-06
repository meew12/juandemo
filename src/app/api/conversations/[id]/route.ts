import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const conversation = await db.conversation.findFirst({
      where: {
        id,
        participants: { some: { id: session.user.id } },
      },
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
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            currency: true,
            priceUnit: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 200,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // Mark messages from others as read
    await db.message.updateMany({
      where: {
        conversationId: id,
        senderId: { not: session.user.id },
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ conversation });
  } catch (err: any) {
    console.error("GET /api/conversations/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    // Verify user is part of conversation
    const conv = await db.conversation.findFirst({
      where: { id, participants: { some: { id: session.user.id } } },
    });
    if (!conv) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const message = await db.message.create({
      data: {
        conversationId: id,
        senderId: session.user.id,
        content: content.trim(),
      },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (err: any) {
    console.error("POST /api/conversations/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
