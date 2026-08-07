import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findConversationsByUser,
  findMessagesByConversation,
  createMessage,
  execute,
} from "@/lib/db-raw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

    // Reuse findConversationsByUser to verify access + hydrate participants/listing
    const userConvs = await findConversationsByUser(session.user.id);
    const found = userConvs.find((r) => r.conversation.id === id);

    if (!found) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    const { conversation, participants, listing } = found;

    // Fetch up to 200 messages ordered ASC (oldest first) — matches Prisma orderBy
    const messages = await findMessagesByConversation(id, { limit: 200 });

    // Mark messages from other participants as read
    await execute(
      `UPDATE Message SET read = 1 WHERE conversationId = ? AND senderId != ? AND read = 0`,
      [id, session.user.id]
    );

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        listingId: conversation.listingId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          lastName: p.lastName,
          avatarInitials: p.avatarInitials,
          verified: p.verified,
        })),
        listing: listing
          ? {
              id: listing.id,
              slug: listing.slug,
              title: listing.title,
              price: listing.price,
              currency: listing.currency,
              priceUnit: listing.priceUnit,
            }
          : null,
        messages,
      },
    });
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
    const userConvs = await findConversationsByUser(session.user.id);
    const found = userConvs.find((r) => r.conversation.id === id);
    if (!found) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    // createMessage handles: INSERT message + UPDATE conversation.updatedAt
    const message = await createMessage({
      conversationId: id,
      senderId: session.user.id,
      content: content.trim(),
    });

    return NextResponse.json({ message });
  } catch (err: any) {
    console.error("POST /api/conversations/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
