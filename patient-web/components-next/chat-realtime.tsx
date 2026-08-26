"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "https://api.nabd.plus";

/**
 * Chat realtime (parity #13 completion): socket.io client authenticated with
 * a thread-scoped chat_rt token (10 min, verified upstream), joins the room
 * and triggers server refresh on peer messages — the message list itself is
 * always re-read from REST, never trusted from the socket payload.
 */
export function ChatRealtime({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "live" | "off">("connecting");
  const socketRef = useRef<Socket | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function start() {
      try {
        const res = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/rt-token`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.token) { if (!cancelled) setStatus("off"); return; }
        const socket: Socket = io(WS_URL, {
          auth: { token: String(data.token) },
          transports: ["websocket"],
          reconnection: true,
          reconnectionDelay: 3000,
        });
        socketRef.current = socket;
        socket.on("connect", () => {
          if (!cancelled) setStatus("live");
          socket.emit("join_thread", { threadId });
        });
        socket.on("new_message", () => {
          if (!cancelled && !refreshing.current && document.visibilityState === "visible") {
            refreshing.current = true;
            router.refresh();
            setTimeout(() => { refreshing.current = false; }, 1500);
          }
        });
        socket.on("disconnect", () => { if (!cancelled) setStatus("off"); });
      } catch {
        if (!cancelled) setStatus("off");
      }
    }
    void start();

    // chat_rt tokens expire in 10 minutes — re-handshake before expiry.
    const renew = setInterval(() => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) return;
      fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/rt-token`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.token) socket.auth = { token: String(data.token) }; })
        .catch(() => null);
    }, 9 * 60 * 1000);

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(renew);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [threadId, router]);

  if (status === "connecting") return <p className="text-xs text-black/40" role="status">جارٍ الاتصال المباشر…</p>;
  if (status === "live") return <p className="text-xs text-emerald-700" role="status">● الاتصال المباشر نشط</p>;
  return (
    <button type="button" onClick={() => router.refresh()} className="text-xs text-black/50 underline">
      الاتصال المباشر غير متاح — حدّث للتحقق من رسائل جديدة
    </button>
  );
}
