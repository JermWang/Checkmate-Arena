import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Send, MessageSquare } from "lucide-react";
import type { ChatMessage, ServerToClientEvents, ClientToServerEvents } from "../../contracts/types";
import { avatarUrl, displayName } from "@/lib/profile";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : window.location.origin);

/**
 * Self-contained chat side panel. Opens its own socket so it works on any page,
 * independent of the match socket. Defaults to the global "lobby" channel.
 */
export function ChatPanel({
  walletAddress,
  channel = "lobby",
  title = "Arena Chat",
  className = "",
}: {
  walletAddress: string | null;
  channel?: string;
  title?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      path: "/socket.io",
    });
    socketRef.current = socket;

    const join = () => {
      setConnected(true);
      if (walletAddress) socket.emit("wallet:connect", { walletAddress });
      socket.emit("chat:join", { channel });
    };

    socket.on("connect", join);
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:history", ({ channel: ch, messages: msgs }) => {
      if (ch === channel) setMessages(msgs);
    });
    socket.on("chat:message", (msg) => {
      if (msg.channel !== channel) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [channel, walletAddress]);

  // Keep scrolled to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const canChat = !!walletAddress && connected;

  const send = () => {
    const text = input.trim();
    if (!text || !canChat) return;
    socketRef.current?.emit("chat:send", { channel, text });
    setInput("");
  };

  const placeholder = useMemo(() => {
    if (!walletAddress) return "Connect a wallet to chat";
    if (!connected) return "Connecting…";
    return "Say something…";
  }, [walletAddress, connected]);

  return (
    <div className={`flex flex-col rounded-xl border border-white/5 bg-white/[0.02] ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <MessageSquare className="w-4 h-4 text-[#E6B84F]" />
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-[#8A8F98]">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[#E6B84F]" : "bg-white/30"}`} />
          {connected ? "live" : "offline"}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-[#8A8F98] text-center py-6">No messages yet. Say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.walletAddress === walletAddress;
            return (
              <div key={m.id} className="flex items-start gap-2">
                <img
                  src={avatarUrl(m.avatar, m.walletAddress)}
                  alt=""
                  className="w-6 h-6 rounded-full bg-white/10 shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xs font-medium truncate ${mine ? "text-[#E6B84F]" : "text-white/90"}`}>
                      {displayName(m.username, m.walletAddress)}
                    </span>
                    <span className="text-[10px] text-[#8A8F98] shrink-0">
                      {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 break-words">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            disabled={!canChat}
            maxLength={300}
            placeholder={placeholder}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8A8F98] focus:outline-none focus:border-[#E6B84F]/40 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!canChat || !input.trim()}
            className="p-2 rounded-lg bg-[#E6B84F] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#E6B84F]/90 transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
