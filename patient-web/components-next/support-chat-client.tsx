"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

export type ChatMsg = { id: string; from: "user" | "agent"; text: string; time: string };
const QUICK = ["إلغاء حجز", "مشكلة في طلب", "استرداد المبلغ", "سؤال عن التأمين", "شكوى"];
const QUICK_EN = ["Cancel booking", "Order issue", "Refund", "Insurance question", "Complaint"];

function parseHistory(payload: unknown, locale: string): ChatMsg[] {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const list = [root.data, root.messages, root.history].find(Array.isArray);
  if (!Array.isArray(list)) return [];
  return list.flatMap((m, i) => {
    if (!m || typeof m !== "object") return [];
    const o = m as Record<string, unknown>;
    if (typeof o.text !== "string" || !o.text) return [];
    const from = o.from === "agent" || o.role === "agent" ? "agent" : "user";
    return [{
      id: String(o.id ?? `h-${i}`),
      from,
      text: o.text,
      time: typeof o.time === "string" ? o.time : typeof o.created_at === "string" ? o.created_at.slice(11, 16) : "",
    }];
  });
}

export function SupportChatClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const [messages, setMessages] = useState<ChatMsg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/patient/support/chat", { cache: "no-store", credentials: "same-origin" });
        const history = res.ok ? parseHistory(await res.json().catch(() => null), locale) : [];
        setMessages(history.length > 0 ? history : [{
          id: "greet",
          from: "agent",
          text: ar ? "مرحباً! أنا دعم نبض — كيف أقدر أساعدك؟" : "Hello! This is Nabd support — how can I help?",
          time: "",
        }]);
      } catch {
        setMessages([{
          id: "greet",
          from: "agent",
          text: ar ? "مرحباً! أنا دعم نبض — كيف أقدر أساعدك؟" : "Hello! This is Nabd support — how can I help?",
          time: "",
        }]);
      }
    })();
  }, [ar, locale]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages, typing]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setError(null);
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setMessages((ms) => [...(ms ?? []), { id: `u-${Date.now()}`, from: "user", text: trimmed, time: stamp }]);
    setDraft("");
    setTyping(true);
    try {
      const res = await fetch("/api/patient/support/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-support-${Date.now()}` },
        body: JSON.stringify({ message: trimmed }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      const rec = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
      const reply = typeof rec.reply === "string" && rec.reply
        ? rec.reply
        : (ar ? "عذراً، حدث خطأ — حاول مجدداً" : "Sorry, something went wrong — please retry");
      setMessages((ms) => [...(ms ?? []), { id: `a-${Date.now()}`, from: "agent", text: reply, time: stamp }]);
    } catch {
      setMessages((ms) => [...(ms ?? []), { id: `a-${Date.now()}`, from: "agent", text: ar ? "عذراً، حدث خطأ — حاول مجدداً" : "Sorry, something went wrong — please retry", time: stamp }]);
    }
    finally { setTyping(false); }
  }

  async function attach(file: File) {
    setAttaching(true); setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      if (!dataUrl) { setError(ar ? "تعذّر قراءة الملف" : "Could not read file"); return; }
      const res = await fetch("/api/support/upload", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-support-file-${Date.now()}` },
        body: JSON.stringify({ data_url: dataUrl, name: file.name }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      const rec = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
      const url = typeof rec.url === "string" ? rec.url : typeof (rec.data as Record<string, unknown> | undefined)?.url === "string"
        ? (rec.data as Record<string, unknown>).url as string : null;
      if (!res.ok || !url) { setError(ar ? "تعذّر الإرفاق" : "Attachment failed"); return; }
      await send(`${ar ? "مرفق: " : "Attachment: "}${url}`);
    } catch { setError(ar ? "تعذّر الإرفاق" : "Attachment failed"); }
    finally { setAttaching(false); }
  }

  const quick = ar ? QUICK : QUICK_EN;
  return (
    <div>
      <p role="status">{ar ? "متاح الآن • ردّ خلال دقيقة" : "Online now • replies within a minute"}</p>
      {messages === null ? (
        <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ التحميل…" : "Loading…"}</p>
      ) : (
        <ul aria-label={ar ? "المحادثة" : "Conversation"}>
          {messages.map((m) => (
            <li key={m.id} style={{ textAlign: m.from === "user" ? "left" : "right" }}>
              <span>{m.text}</span>
              {m.time ? <span> — {m.time}</span> : null}
            </li>
          ))}
          {typing ? <li>{ar ? "يكتب…" : "Typing…"}</li> : null}
        </ul>
      )}
      <div ref={bottom} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label={ar ? "ردود سريعة" : "Quick replies"}>
        {quick.map((q) => <button key={q} type="button" onClick={() => send(q)} disabled={typing}>{q}</button>)}
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <form onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) attach(f); e.target.value = ""; }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={attaching} aria-label={ar ? "إرفاق صورة" : "Attach image"}>
          {attaching ? <LoaderCircle size={17} aria-hidden="true" /> : "+"}
        </button>
        <label>
          <span>{ar ? "اكتب رسالتك..." : "Type your message..."}</span>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} />
        </label>
        <button type="submit" disabled={typing || !draft.trim()}>{ar ? "إرسال" : "Send"}</button>
      </form>
    </div>
  );
}
