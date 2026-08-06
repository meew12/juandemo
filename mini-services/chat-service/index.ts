import { createServer } from "http";
import { Server } from "socket.io";

const PORT = 3003;

const httpServer = createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "umpi-chat",
        port: PORT,
        onlineUsers: userSockets.size,
      })
    );
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("UMPI Chat Service");
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

// Track connected users: userId -> Set<socketId>
const userSockets = new Map<string, Set<string>>();

// Returns the list of currently online user IDs
function getOnlineUsers(): string[] {
  return Array.from(userSockets.keys());
}

io.on("connection", (socket) => {
  const userId = (socket.handshake.query.userId as string) || socket.id;
  const isNewUser = !userSockets.has(userId);

  console.log(`✓ Usuario conectado: ${userId} (socket: ${socket.id})`);

  // Track user socket
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socket.id);
  socket.join(`user:${userId}`);

  // Send current online users to the new connection (initial sync)
  socket.emit("online-users", getOnlineUsers());

  // If this is a brand-new user (first socket), notify everyone else
  if (isNewUser) {
    socket.broadcast.emit("user-online", userId);
  }

  // ─── Message sent event ───
  socket.on("message-sent", (data: { conversationId: string; recipientId?: string }) => {
    console.log(`→ Mensaje en conversación ${data.conversationId} de ${userId}`);
    // Broadcast to all OTHER sockets (recipient client filters by conversationId)
    socket.broadcast.emit("new-message", {
      conversationId: data.conversationId,
      from: userId,
    });
    // If recipientId is provided, emit specifically (ensures delivery)
    if (data.recipientId) {
      io.to(`user:${data.recipientId}`).emit("new-message", {
        conversationId: data.conversationId,
        from: userId,
      });
    }
  });

  // ─── Typing indicator ───
  socket.on(
    "typing",
    (data: { conversationId: string; userId: string; userName: string }) => {
      socket.broadcast.emit("typing", {
        conversationId: data.conversationId,
        userId: data.userId,
        userName: data.userName,
      });
    }
  );

  socket.on("stop_typing", (data: { conversationId: string; userId: string }) => {
    socket.broadcast.emit("stop_typing", {
      conversationId: data.conversationId,
      userId: data.userId,
    });
  });

  // ─── Read receipts ───
  socket.on("mark_read", (data: { conversationId: string; userId: string }) => {
    socket.broadcast.emit("messages_read", {
      conversationId: data.conversationId,
      userId: data.userId,
    });
  });

  // ─── Notification broadcast ───
  socket.on(
    "notify",
    (data: { recipientId: string; type: string; title: string; body: string }) => {
      io.to(`user:${data.recipientId}`).emit("notification", data);
    }
  );

  // ─── Disconnect ───
  socket.on("disconnect", () => {
    console.log(`✗ Usuario desconectado: ${userId} (socket: ${socket.id})`);
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        // User fully offline — notify everyone
        socket.broadcast.emit("user-offline", userId);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀 UMPI Chat Service corriendo en puerto ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

export { getOnlineUsers };
