import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findConversationsByUser,
  getUserById,
  queryCount,
  execute,
  generateCuid,
  nowISO,
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

    const rows = await findConversationsByUser(session.user.id);

    // Get unread counts for each conversation in parallel
    const withUnread = await Promise.all(
      rows.map(async ({ conversation, participants, lastMessage, listing }) => {
        const unread = await queryCount(
          `SELECT COUNT(*) as count FROM Message WHERE conversationId = ? AND senderId != ? AND read = 0`,
          [conversation.id, session.user.id]
        );
        return {
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
              }
            : null,
          messages: lastMessage ? [lastMessage] : [],
          unreadCount: unread,
        };
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

    // Find or create conversation.
    // If listingId is provided, look for an existing conversation that
    // (a) the current user participates in and (b) is tied to that listing.
    let existing: Awaited<ReturnType<typeof findConversationsByUser>>[number] | null = null;
    if (listingId) {
      const userConvs = await findConversationsByUser(session.user.id);
      existing =
        userConvs.find((r) => r.conversation.listingId === listingId) ?? null;
    }

    let conversation;

    if (existing) {
      const { conversation: conv, participants } = existing;
      conversation = {
        id: conv.id,
        listingId: conv.listingId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          lastName: p.lastName,
          avatarInitials: p.avatarInitials,
          verified: p.verified,
        })),
      };
    } else {
      // Create new conversation via raw SQL — db-raw has no createConversation helper.
      const id = generateCuid();
      const now = nowISO();
      await execute(
        `INSERT INTO Conversation (id, listingId, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
        [id, listingId || null, now, now]
      );
      // Prisma generates a join table `_ConversationParticipants` with A=conversationId, B=userId
      await execute(
        `INSERT INTO _ConversationParticipants (A, B) VALUES (?, ?)`,
        [id, session.user.id]
      );
      if (sellerId && sellerId !== session.user.id) {
        await execute(
          `INSERT INTO _ConversationParticipants (A, B) VALUES (?, ?)`,
          [id, sellerId]
        );
      }

      // Re-fetch participants to build the response shape
      const me = await getUserById(session.user.id);
      const them = sellerId ? await getUserById(sellerId) : null;
      const participantUsers = [me, them].filter(
        (u): u is NonNullable<typeof u> => Boolean(u)
      );

      conversation = {
        id,
        listingId: listingId || null,
        createdAt: now,
        updatedAt: now,
        participants: participantUsers.map((p) => ({
          id: p.id,
          name: p.name,
          lastName: p.lastName,
          avatarInitials: p.avatarInitials,
          verified: p.verified,
        })),
      };
    }

    return NextResponse.json({ conversation });
  } catch (err: any) {
    console.error("POST /api/conversations error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
