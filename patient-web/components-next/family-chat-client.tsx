"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Msg = { id: string; text: string; sender: string; time: string; isMe: boolean; pending?: boolean };

function parseMessages(payload: unknown, myId: string): { messages: Msg[]; members: number } {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const list = [root.rows, root.data, root.messages].find(Array.isArray);
  const messages = (Array.isArray(list) ? list : []).flatMap((m) => {
    if (!m || typeof m !== "object") return [];
    const o = m as Record<string, unknown>;
    if (typeof o.text !== "string" || !o.text) return [];
    const senderId = typeof o.sender_id === "string" ? o.sender_id : null;
    const isMe = senderId !== null && senderId === myId;
    const created = typeof o.created_at === "string" ? o.created_at : null;
    return [{
      id: String(o.id ?? `${created ?? ""}-${o.text}`),
      text: o.text,
      sender: isMe ? "" : (typeof o.sender_name === "string" && o.sender_name) || "",
      time: created ?? "",
      isMe,
    }];
  });
  const members = typeof root.member_count === "number" ? root.member_count : 0;
  return { messages, members };
}

export function FamilyChatClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [members, setMembers] = useState(0);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const myId = useRef("");
  const stopped = useRef(false);

  const load = useCallback(async (silent: boolean) => {
    try {
      if (!myId.current) {
        const p = await fetch("/api/patient/users/me/profile", { cache: "no-store", credentials: "same-origin" });
        if (p.ok) {
          const pj = await p.json().catch(() => null);
          const proot = (pj && typeof pj === "object" ? pj : {}) as Record<string, unknown>;
          const prec = (proot.data && typeof proot.data === "object" ? proot.data : proot) as Record<string, unknown>;
          if (typeof prec.user_id === "string") myId.current = prec.user_id;
          else if (typeof prec.id === "string") myId.current = prec.id;
        }
      }
      const res = await fetch("/api/patient/family/chat/messages", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { if (!silent) setFailed(true); return; }
      const parsed = parseMessages(await res.json().catch(() => null), myId.current);
      setMessages(parsed.messages);
      setMembers(parsed.members);
      setFailed(false);
    } catch { if (!silent) setFailed(true); }
  }, []);

  useEffect(() => {
    stopped.current = false;
    load(false);
    const timer = setInterval(() => { if (!stopped.current) load(true); }, 5000);
    return () => { stopped.current = true; clearInterval(timer); };
  }, [load]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic: Msg = { id: `tmp-${Date.now()}`, text, sender: ar ? "أنت" : "You", time: "", isMe: true, pending: true };
    setMessages((ms) => [...(ms ?? []), optimistic]);
    setDraft("");
    try {
      const res = await fetch("/api/patient/family/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-family-chat-${Date.now()}` },
        body: JSON.stringify({ text }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        setMessages((ms) => (ms ?? []).filter((m) => m.id !== optimistic.id));
      } else {
        const saved = await res.json().catch(() => null);
        const srec = saved && typeof saved === "object" ? ((saved as Record<string, unknown>).data ?? saved) as Record<string, unknown> : null;
        const realId = srec && typeof srec.id !== "undefined" ? String(srec.id) : optimistic.id;
        setMessages((ms) => (ms ?? []).map((m) => (m.id === optimistic.id ? { ...m, id: realId, pending: false } : m)));
      }
    } catch {
      setMessages((ms) => (ms ?? []).filter((m) => m.id !== optimistic.id));
    }
    finally { setSending(false); }
  }

  if (messages === null && !failed) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  if (failed && messages === null) {
    return (
      <div>
        <p role="alert">{ar ? "تعذر تحميل المحادثة" : "Could not load conversation"}</p>
        <button type="button" onClick={() => load(false)}>{ar ? "إعادة المحاولة" : "Retry"}</button>
      </div>
    );
  }
  return (
    <div>
      <p>{ar ? "محادثة العائلة" : "Family conversation"}{members > 0 ? ` — ${members} ${ar ? "أفراد" : "members"}` : ""}</p>
      {(messages ?? []).length === 0 ? (
        <p role="status">{ar ? "لا توجد رسائل بعد — ابدأ التحية!" : "No messages yet — say hello!"}</p>
      ) : (
        <ul>
          {(messages ?? []).map((m) => (
            <li key={m.id} style={{ opacity: m.pending ? 0.6 : 1 }}>
              {!m.isMe && m.sender ? <strong>{m.sender}: </strong> : null}
              {m.text}
              {m.time ? <span> — {m.time}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {!failed ? (
        <form onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label>
            <span>{ar ? "اكتب رسالة…" : "Type a message…"}</span>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} />
          </label>
          <button type="submit" disabled={sending || !draft.trim()}>{ar ? "إرسال" : "Send"}</button>
        </form>
      ) : null}
    </div>
  );
}
