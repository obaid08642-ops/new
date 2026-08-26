"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, SendHorizontal, X } from "lucide-react";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

/**
 * Chat composer (parity #13 completion): text + attachments. Files upload
 * first via the BFF (purpose=chat bound to this thread upstream), then the
 * send carries their media_ids — the server re-validates ownership on send.
 * The sent message appears after the server refresh returns it.
 */
export function ChatComposer({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ id: string; name: string } | null>(null);
  const markedRead = useRef(false);

  useEffect(() => {
    if (markedRead.current) return;
    markedRead.current = true;
    fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/read`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }).catch(() => null);
  }, [threadId]);

  async function pickFile(fileEvent: React.ChangeEvent<HTMLInputElement>) {
    const file = fileEvent.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setError("الحد الأقصى للمرفق 15 ميجابايت"); return; }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/media`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر رفع المرفق");
        return;
      }
      setAttachment({ id: String(data.id), name: file.name });
    } catch {
      setError("تعذر رفع المرفق — حاول لاحقًا");
    } finally {
      setUploading(false);
      fileEvent.target.value = "";
    }
  }

  async function send() {
    const body = text.trim();
    if ((!body && !attachment) || sending || uploading) return;
    setSending(true); setError(null);
    try {
      const res = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          client_message_id: crypto.randomUUID(),
          ...(body ? { body } : {}),
          ...(attachment ? { media_ids: [attachment.id] } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر الإرسال");
        return;
      }
      setText("");
      setAttachment(null);
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: ".5rem", marginTop: ".4rem" }}>
      <label className="sr-only" htmlFor="chat-composer-input">اكتب رسالتك</label>
      <textarea
        id="chat-composer-input"
        aria-label="اكتب رسالتك"
        value={text}
        maxLength={4000}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !sending && !uploading) { event.preventDefault(); void send(); } }}
        rows={2}
        style={{ width: "100%", resize: "vertical", borderRadius: "1rem", border: "1px solid rgba(229,232,238,.9)", padding: ".8rem 1rem", font: "inherit" }}
        disabled={sending}
      />
      <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
        <label aria-label="إرفاق ملف" style={{ cursor: uploading ? "wait" : "pointer", border: "1px solid rgba(229,232,238,.9)", borderRadius: "999px", padding: ".35rem .7rem", display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
          <Paperclip size={15} aria-hidden="true" />
          {uploading ? "جارٍ الرفع..." : "إرفاق"}
          <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.mp3,.m4a,.wav,.doc,.docx,.xls,.xlsx" onChange={pickFile} disabled={uploading || sending} hidden />
        </label>
        {attachment ? (
          <span className="text-xs" style={{ display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
            📎 {attachment.name.slice(0, 40)}
            <button type="button" aria-label="إزالة المرفق" onClick={() => setAttachment(null)} disabled={sending}>
              <X size={13} />
            </button>
          </span>
        ) : null}
        <button type="button" onClick={send} disabled={sending || uploading || (!text.trim() && !attachment)}
          style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: ".45rem", border: "none", cursor: sending ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".65rem 1.3rem" }}>
          <SendHorizontal size={16} aria-hidden="true" />
          {sending ? "جارٍ الإرسال..." : "إرسال"}
        </button>
      </div>
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
    </section>
  );
}
