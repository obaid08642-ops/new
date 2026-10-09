"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/settings/settings.module.css";

export type ChatMsg = { id: string; from: "user" | "agent"; text: string; time: string };
const QUICK = ["quickCancel", "quickOrder", "quickRefund", "quickInsurance", "quickComplaint"] as const;

function parseHistory(payload: unknown): ChatMsg[] {
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

/**
 * The support chat (GET and POST /api/patient/support/chat, image upload through /api/support/upload): the history, a message
 * box, quick replies and an image attachment, on the shared chat bubbles. The logic is the old client's; the texts are keys.
 */
export function SupportChatClient() {
  const t = useTranslations("SupportChatWeb");
  const [messages, setMessages] = useState<ChatMsg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const greeting = t("greeting");
  const failedReply = t("replyFailed");

  useEffect(() => {
    (async () => {
      let history: ChatMsg[] = [];
      try {
        const res = await fetch("/api/patient/support/chat", { cache: "no-store", credentials: "same-origin" });
        history = res.ok ? parseHistory(await res.json().catch(() => null)) : [];
      } catch { /* the greeting below is shown instead */ }
      setMessages(history.length > 0 ? history : [{ id: "greet", from: "agent", text: greeting, time: "" }]);
    })();
  }, [greeting]);

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
      const reply = typeof rec.reply === "string" && rec.reply ? rec.reply : failedReply;
      setMessages((ms) => [...(ms ?? []), { id: `a-${Date.now()}`, from: "agent", text: reply, time: stamp }]);
    } catch {
      setMessages((ms) => [...(ms ?? []), { id: `a-${Date.now()}`, from: "agent", text: failedReply, time: stamp }]);
    } finally { setTyping(false); }
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
      if (!dataUrl) { setError(t("readFailed")); return; }
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
      if (!res.ok || !url) { setError(t("attachFailed")); return; }
      await send(t("attachment", { url }));
    } catch { setError(t("attachFailed")); }
    finally { setAttaching(false); }
  }

  return (
    <>
      {messages === null ? (
        <p className={rx.status} role="status"><Spinner />{t("loading")}</p>
      ) : (
        <ul className={rx.messages} aria-label={t("conversation")}>
          {messages.map((m) => (
            <li key={m.id} className={`${rx.message} ${m.from === "user" ? rx.messageMine : rx.messageTheirs}`}>
              <p className={`${rx.bubble} ${m.from === "user" ? rx.bubbleMine : rx.bubbleTheirs}`}>{m.text}</p>
              {m.time ? <span className={rx.messageMeta}><bdi>{m.time}</bdi></span> : null}
            </li>
          ))}
          {typing ? <li className={`${rx.message} ${rx.messageTheirs}`}><p className={`${rx.bubble} ${rx.bubbleTheirs}`}>{t("typing")}</p></li> : null}
        </ul>
      )}
      <div ref={bottom} />
      <div className={forms.choices} role="group" aria-label={t("quickReplies")}>
        {QUICK.map((key) => <button key={key} type="button" className={forms.choice} onClick={() => void send(t(key))} disabled={typing}>{t(key)}</button>)}
      </div>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <form className={rx.composer} onSubmit={(event: FormEvent) => { event.preventDefault(); void send(draft); }}>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />
        <label className={forms.field}>
          <span className={forms.label}>{t("message")}</span>
          <input className={forms.control} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} />
        </label>
        <div className={styles.actionsRow}>
          <Button label={t("attach")} variant="outline" startIcon="image" loading={attaching} onClick={() => fileRef.current?.click()} />
          <Button type="submit" label={t("send")} disabled={typing || !draft.trim()} />
        </div>
      </form>
    </>
  );
}
