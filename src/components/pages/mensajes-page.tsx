"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import {
  Send,
  Search,
  MessageCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { formatPriceWithUnit } from "@/lib/utils-umpi";

// ─────────────────────────── Types ───────────────────────────

interface ConversationParticipant {
  id: string;
  name: string | null;
  lastName: string | null;
  avatarInitials: string | null;
  verified: boolean;
}

interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  read: boolean;
  createdAt: string;
}

interface ConversationItem {
  id: string;
  listingId: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  participants: ConversationParticipant[];
  listing: {
    id: string;
    slug: string;
    title: string;
    price: number;
    currency: string;
    priceUnit: string | null;
  } | null;
  messages: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  }[];
}

interface ConversationDetail extends ConversationItem {
  messages: MessageItem[];
}

// ─────────────────────────── Fetchers ───────────────────────────

async function fetchConversations() {
  const res = await fetch("/api/conversations");
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.conversations as ConversationItem[];
}

async function fetchConversation(id: string) {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) throw new Error("Error");
  const data = await res.json();
  return data.conversation as ConversationDetail;
}

// ─────────────────────────── Helpers ───────────────────────────

/** Compact timestamp for the conversation list: "ahora", "hace 5 min", "hace 2 h", "ayer", "dd/mm" */
function formatConvTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isToday = today.getTime() === msgDay.getTime();
  const yesterday = new Date(today.getTime() - 86400000);
  const isYesterday = yesterday.getTime() === msgDay.getTime();

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (isToday) return `hace ${diffH} h`;
  if (isYesterday) return "ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

/** "HH:mm" for message timestamps */
function formatMessageTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/** Date separator label: "Hoy", "Ayer", or "dd/mm/yyyy" */
function formatDateSeparator(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (today.getTime() === msgDay.getTime()) return "Hoy";
  const yesterday = new Date(today.getTime() - 86400000);
  if (yesterday.getTime() === msgDay.getTime()) return "Ayer";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function sameDay(a: Date | string, b: Date | string): boolean {
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  return da.toDateString() === db.toDateString();
}

/** Consecutive messages from same sender within 5 minutes are grouped */
function isSameGroup(a: MessageItem, b: MessageItem): boolean {
  if (a.senderId !== b.senderId) return false;
  const diff = Math.abs(
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return diff <= 5 * 60 * 1000;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max).trimEnd() + "…";
}

function participantDisplayName(p?: ConversationParticipant): string {
  if (!p) return "Usuario";
  const first = p.name || "";
  const last = p.lastName || "";
  const full = `${first} ${last}`.trim();
  return full || "Usuario";
}

// ─────────────────────────── Read receipt icon ───────────────────────────

function ReceiptIcon({
  state,
  mine,
}: {
  state: "sent" | "delivered" | "read";
  mine: boolean;
}) {
  if (!mine) return null;
  if (state === "sent") {
    return <Check className="w-3.5 h-3.5 text-white/70" strokeWidth={2.5} />;
  }
  if (state === "delivered") {
    return <CheckCheck className="w-3.5 h-3.5 text-white/70" strokeWidth={2.2} />;
  }
  // read — blue double check
  return <CheckCheck className="w-3.5 h-3.5 text-[#3b9bff]" strokeWidth={2.2} />;
}

// ─────────────────────────── Page ───────────────────────────

export function MensajesPage({
  onNavigate,
}: {
  onNavigate: (page: string, params?: any) => void;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time state
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [sentMessageIds, setSentMessageIds] = useState<Set<string>>(new Set());

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    enabled: !!session?.user?.id,
    refetchInterval: 10000,
  });

  const { data: selectedConv } = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: () => fetchConversation(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 5000,
  });

  // ─── Socket.io connection (created once per session) ───
  const socketRef = useRef<Socket | null>(null);
  // selectedIdRef is kept in sync via effect so socket callbacks (registered
  // once) always see the latest conversation without re-creating the socket.
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const currentUserId = session.user.id;
    const newSocket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      query: {
        userId: currentUserId,
        userName: session.user.name || "",
      },
    });
    socketRef.current = newSocket;

    // Initial online users list
    newSocket.on("online-users", (users: string[]) => {
      setOnlineUsers(new Set(users));
    });

    // Online / offline
    newSocket.on("user-online", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    });
    newSocket.on("user-offline", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // Typing
    newSocket.on(
      "typing",
      (data: { conversationId: string; userId: string; userName: string }) => {
        if (
          data.conversationId === selectedIdRef.current &&
          data.userId !== currentUserId
        ) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.add(data.userId);
            return next;
          });
        }
      }
    );
    newSocket.on(
      "stop_typing",
      (data: { conversationId: string; userId: string }) => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }
    );

    // Read receipts
    newSocket.on(
      "messages_read",
      (data: { conversationId: string; userId: string }) => {
        if (data.conversationId === selectedIdRef.current) {
          queryClient.invalidateQueries({
            queryKey: ["conversation", selectedIdRef.current],
          });
        }
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    );

    // New message
    newSocket.on(
      "new-message",
      (data: { conversationId: string; from?: string }) => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (data.conversationId === selectedIdRef.current) {
          queryClient.invalidateQueries({
            queryKey: ["conversation", selectedIdRef.current],
          });
          // Auto mark_read if message is from the other participant
          if (data.from && data.from !== currentUserId) {
            newSocket.emit("mark_read", {
              conversationId: data.conversationId,
              userId: currentUserId,
            });
          }
        }
      }
    );

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [session?.user?.id, session?.user?.name, queryClient]);

  // Clear typing indicators when switching conversations (derived-state pattern,
  // avoids calling setState synchronously inside an effect per react-hooks rule).
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(null);
  if (prevSelectedId !== selectedId) {
    setPrevSelectedId(selectedId);
    setTypingUsers(new Set());
  }

  // When a conversation is opened, mark messages as read (side-effect only)
  useEffect(() => {
    if (!selectedId || !session?.user?.id) return;
    socketRef.current?.emit("mark_read", {
      conversationId: selectedId,
      userId: session.user.id,
    });
    // Invalidate to reflect updated read state from the API
    queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [selectedId, session?.user?.id, queryClient]);

  // Auto scroll on new messages / typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages, typingUsers]);

  // ─── Typing debounce refs ───
  const lastTypingEmitRef = useRef<number>(0);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);

    if (!val.trim() || !selectedId || !session?.user?.id || !socketRef.current) {
      // If input cleared, stop typing
      if (!val.trim() && stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current);
        stopTypingTimerRef.current = null;
        socketRef.current?.emit("stop_typing", {
          conversationId: selectedId,
          userId: session?.user?.id,
        });
        lastTypingEmitRef.current = 0;
      }
      return;
    }

    // Emit typing at most once every 2 seconds
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      lastTypingEmitRef.current = now;
      socketRef.current.emit("typing", {
        conversationId: selectedId,
        userId: session.user.id,
        userName: session.user.name || "Usuario",
      });
    }

    // Reset stop_typing timer — emit stop_typing after 3s of inactivity
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", {
        conversationId: selectedId,
        userId: session?.user?.id,
      });
      lastTypingEmitRef.current = 0;
    }, 3000);
  };

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: (data) => {
      const newId: string | undefined = data?.message?.id;
      if (newId) {
        // Track as "just sent" for ~2.5s to show the single-check state
        setSentMessageIds((prev) => {
          const next = new Set(prev);
          next.add(newId);
          return next;
        });
        setTimeout(
          () => {
            setSentMessageIds((prev) => {
              const next = new Set(prev);
              next.delete(newId);
              return next;
            });
          },
          2500
        );
      }
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      // Notify other participant(s) in real time
      socketRef.current?.emit("message-sent", { conversationId: selectedId });
    },
    onError: () => {
      toast.error("No se pudo enviar el mensaje");
    },
  });

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || !selectedId || !session?.user?.id) return;

    // Stop typing indicator immediately
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = null;
    }
    socketRef.current?.emit("stop_typing", {
      conversationId: selectedId,
      userId: session.user.id,
    });
    lastTypingEmitRef.current = 0;

    sendMessage.mutate(message);
    setMessage("");
  };

  // ─── Auth gate ───
  if (!session?.user?.id) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-16 text-center">
        <MessageCircle className="w-12 h-12 text-[var(--umpi-text3)] mx-auto mb-4" />
        <h2 className="font-display text-xl mb-2">Iniciá sesión para ver tus mensajes</h2>
        <p className="text-sm text-[var(--umpi-text2)] mb-4">
          Comunicate con vendedores y compradores en tiempo real
        </p>
      </div>
    );
  }

  const filteredConvs =
    conversations?.filter((c) => {
      if (!search) return true;
      const other = c.participants.find((p) => p.id !== session.user.id);
      const name = `${other?.name || ""} ${other?.lastName || ""}`.toLowerCase();
      return (
        name.includes(search.toLowerCase()) ||
        c.listing?.title.toLowerCase().includes(search.toLowerCase())
      );
    }) || [];

  const selectedOther = selectedConv?.participants.find(
    (p) => p.id !== session.user.id
  );
  const selectedOtherOnline = selectedOther
    ? onlineUsers.has(selectedOther.id)
    : false;

  // Typing indicator display name (from active conversation participants)
  const typingNames = selectedConv
    ? Array.from(typingUsers)
        .map((id) => {
          const p = selectedConv.participants.find((pp) => pp.id === id);
          return p ? participantDisplayName(p) : null;
        })
        .filter((n): n is string => Boolean(n))
    : [];
  const typingText =
    typingNames.length === 0
      ? ""
      : typingNames.length === 1
      ? `${typingNames[0]} está escribiendo…`
      : `${typingNames.length} personas escribiendo…`;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Local style for typing dots bounce */}
      <style>{`
        @keyframes umpiTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .umpi-typing-dot { animation: umpiTypingBounce 1.2s ease-in-out infinite; }
      `}</style>

      <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-xl overflow-hidden grid md:grid-cols-[320px_1fr] h-[calc(100vh-180px)] min-h-[500px]">
        {/* ─── Conversations list ─── */}
        <div
          className={`border-r border-[var(--umpi-border)] flex flex-col ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-[var(--umpi-border)]">
            <h2 className="font-display text-lg mb-3">Mensajes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
              <Input
                type="search"
                placeholder="Buscar conversación…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-[var(--umpi-surface2)] text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-[var(--umpi-surface2)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-20 bg-[var(--umpi-surface2)] rounded" />
                      <div className="h-2 w-full bg-[var(--umpi-surface2)] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--umpi-text3)]">
                No tenés conversaciones todavía
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const other = conv.participants.find(
                  (p) => p.id !== session.user.id
                );
                const lastMsg = conv.messages[0];
                const isOnline = other ? onlineUsers.has(other.id) : false;
                const preview = lastMsg?.content || "Iniciá la conversación";
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full flex items-start gap-3 p-3 border-b border-[var(--umpi-border)] hover:bg-[var(--umpi-surface2)] transition-colors text-left ${
                      selectedId === conv.id ? "bg-[var(--umpi-accent-soft)]" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="text-xs font-semibold bg-[var(--umpi-accent)] text-white">
                          {other?.avatarInitials || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--umpi-green)] border-2 border-[var(--umpi-surface)]"
                          aria-label="En línea"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate flex items-center gap-1">
                          <span className="truncate">
                            {participantDisplayName(other)}
                          </span>
                          {other?.verified && (
                            <BadgeCheck className="w-3 h-3 text-[var(--umpi-green)] shrink-0" />
                          )}
                        </p>
                        <span className="text-[10px] text-[var(--umpi-text3)] shrink-0">
                          {lastMsg ? formatConvTime(lastMsg.createdAt) : ""}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--umpi-text2)] truncate">
                        {truncate(preview, 40)}
                      </p>
                      {conv.listing && (
                        <p className="text-[10px] text-[var(--umpi-text3)] truncate mt-0.5">
                          📦 {conv.listing.title}
                        </p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-[var(--umpi-accent)] text-white text-[10px] uppercase tracking-wide px-2 py-0 shrink-0 hover:bg-[var(--umpi-accent)]">
                        {conv.unreadCount > 1 ? `${conv.unreadCount} nuevos` : "Nuevo"}
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Chat area ─── */}
        <div className={`flex flex-col ${!selectedId ? "hidden md:flex" : "flex"}`}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3 border-b border-[var(--umpi-border)] flex items-center gap-3">
                <button
                  onClick={() => setSelectedId(null)}
                  className="md:hidden p-1 hover:bg-[var(--umpi-surface2)] rounded"
                  aria-label="Volver"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative shrink-0">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="text-xs font-semibold bg-[var(--umpi-accent)] text-white">
                      {selectedOther?.avatarInitials || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {selectedOtherOnline && (
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--umpi-green)] border-2 border-[var(--umpi-surface)]"
                      aria-label="En línea"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <span className="truncate">
                      {participantDisplayName(selectedOther)}
                    </span>
                    {selectedOther?.verified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-[var(--umpi-green)] shrink-0" />
                    )}
                  </p>
                  <p
                    className={`text-xs flex items-center gap-1 ${
                      selectedOtherOnline
                        ? "text-[var(--umpi-green)]"
                        : "text-[var(--umpi-text3)]"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedOtherOnline
                          ? "bg-[var(--umpi-green)]"
                          : "bg-[var(--umpi-text3)]"
                      }`}
                    />
                    {selectedOtherOnline ? "En línea" : "Desconectado"}
                  </p>
                </div>
                {selectedConv.listing && (
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-[var(--umpi-text2)] truncate max-w-[200px]">
                      {selectedConv.listing.title}
                    </p>
                    <p className="text-xs font-semibold text-[var(--umpi-accent)]">
                      {formatPriceWithUnit(
                        selectedConv.listing.price,
                        selectedConv.listing.currency,
                        selectedConv.listing.priceUnit || undefined
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-0.5 bg-[var(--umpi-bg)]">
                {selectedConv.messages.map((msg, i) => {
                  const prev = selectedConv.messages[i - 1];
                  const next = selectedConv.messages[i + 1];
                  const showDateSep = !prev || !sameDay(prev.createdAt, msg.createdAt);
                  const startGroup = !prev || !isSameGroup(prev, msg);
                  const endGroup = !next || !isSameGroup(msg, next);
                  const mine = msg.senderId === session.user.id;

                  const receipt: "sent" | "delivered" | "read" = sentMessageIds.has(
                    msg.id
                  )
                    ? "sent"
                    : msg.read
                    ? "read"
                    : "delivered";

                  return (
                    <div key={msg.id}>
                      {showDateSep && (
                        <div className="flex items-center justify-center my-4">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--umpi-text3)] bg-[var(--umpi-surface2)] px-3 py-1 rounded-full border border-[var(--umpi-border)]">
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex items-end gap-2 ${
                          mine ? "justify-end" : "justify-start"
                        } ${startGroup ? "mt-3" : "mt-0.5"}`}
                      >
                        {!mine &&
                          (endGroup ? (
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarFallback className="text-[10px] font-semibold bg-[var(--umpi-accent)] text-white">
                                {selectedOther?.avatarInitials || "U"}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-7 shrink-0" aria-hidden="true" />
                          ))}
                        <div
                          className={`group max-w-[78%] sm:max-w-[70%] px-3 py-2 transition-all ${
                            mine
                              ? "bg-[var(--umpi-accent)] text-white rounded-2xl rounded-br-md hover:bg-[var(--umpi-accent2)]"
                              : "bg-[var(--umpi-surface)] border border-[var(--umpi-border)] text-[var(--umpi-text)] rounded-2xl rounded-bl-md hover:border-[var(--umpi-text3)]"
                          } ${
                            startGroup ? "" : mine ? "rounded-br-sm" : "rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-line break-words">
                            {msg.content}
                          </p>
                          <div
                            className={`flex items-center gap-1 mt-0.5 justify-end ${
                              mine ? "text-white/70" : "text-[var(--umpi-text3)]"
                            }`}
                          >
                            <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                            <ReceiptIcon state={receipt} mine={mine} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator bubble */}
                {typingUsers.size > 0 && (
                  <div className="flex items-end gap-2 mt-3 animate-fade-in">
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className="text-[10px] font-semibold bg-[var(--umpi-accent)] text-white">
                        {selectedOther?.avatarInitials || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-[var(--umpi-surface)] border border-[var(--umpi-border)] rounded-2xl rounded-bl-md px-3 py-2.5 flex items-center gap-1">
                      <span
                        className="umpi-typing-dot w-1.5 h-1.5 rounded-full bg-[var(--umpi-accent)]"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="umpi-typing-dot w-1.5 h-1.5 rounded-full bg-[var(--umpi-accent)]"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="umpi-typing-dot w-1.5 h-1.5 rounded-full bg-[var(--umpi-accent)]"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing status text + Input */}
              <div className="border-t border-[var(--umpi-border)] bg-[var(--umpi-surface)]">
                {typingText && (
                  <div className="px-4 pt-1.5 pb-0.5 text-[11px] text-[var(--umpi-text2)] flex items-center gap-1.5 animate-fade-in">
                    <span className="flex gap-0.5 items-center">
                      <span
                        className="umpi-typing-dot w-1 h-1 rounded-full bg-[var(--umpi-text2)]"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="umpi-typing-dot w-1 h-1 rounded-full bg-[var(--umpi-text2)]"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="umpi-typing-dot w-1 h-1 rounded-full bg-[var(--umpi-text2)]"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                    <span className="italic">{typingText}</span>
                  </div>
                )}
                <form
                  onSubmit={handleSend}
                  className="p-3 flex items-center gap-2"
                >
                  <Input
                    type="text"
                    placeholder="Escribí un mensaje…"
                    value={message}
                    onChange={handleInputChange}
                    className="flex-1 bg-[var(--umpi-surface2)] rounded-full h-10"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || sendMessage.isPending}
                    className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white rounded-full w-10 h-10 shrink-0"
                    aria-label="Enviar mensaje"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageCircle className="w-12 h-12 text-[var(--umpi-text3)] mx-auto mb-3" />
                <p className="text-[var(--umpi-text2)] text-sm">
                  Seleccioná una conversación para empezar a chatear
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
