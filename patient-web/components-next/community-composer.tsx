"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/** New post composer (parity #31): real POST /community/posts via BFF. */
export function CommunityComposer() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    setBusy(true); setError(null); setDone(false);
    try {
      const res = await fetch("/api/community/new", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          title: String(form.get("title") || ""),
          body: String(form.get("body") || ""),
          is_anonymous: form.get("anonymous") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر النشر");
        return;
      }
      setDone(true);
      formEvent.currentTarget.reset();
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: ".5rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }} aria-label="منشور جديد">
      <input name="title" required minLength={3} maxLength={200} aria-label="عنوان المنشور" style={fieldStyle} />
      <textarea name="body" required minLength={3} maxLength={8000} rows={3} aria-label="نص المنشور" style={{ ...fieldStyle, resize: "vertical", font: "inherit" }} />
      <label className="text-xs flex items-center gap-2">
        <input type="checkbox" name="anonymous" /> نشر مجهول
      </label>
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      {done ? <p role="status" style={{ margin: 0, fontSize: ".82rem", color: "#0b7a53" }}>تم النشر</p> : null}
      <button type="submit" disabled={busy} style={{ justifySelf: "start", border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
        {busy ? "..." : "نشر"}
      </button>
    </form>
  );
}

/** Vote + inline comment (parity #31): real PUT vote / POST comment. */
export function CommunityPostActions({ postId, score }: { postId: string; score: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commenting, setCommenting] = useState(false);

  async function send(path: string, payload: unknown, method: "POST" | "PUT", action: string) {
    if (busy) return;
    setBusy(action); setError(null);
    try {
      const res = await fetch(`/api/community/${path}`, {
        method,
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "تعذر التنفيذ");
        return;
      }
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="shrink-0 text-right">
      <div className="flex items-center gap-1 justify-end">
        <button type="button" aria-label="تصويت لأعلى" disabled={busy !== null}
          onClick={() => void send(`vote/${encodeURIComponent(postId)}`, { vote: "up" }, "PUT", `up-${postId}`)}
          style={{ border: "1px solid rgba(229,232,238,.9)", borderRadius: "999px", background: "#fff", padding: ".15rem .55rem" }}>
          ▲
        </button>
        <span className="text-sm font-bold">{score}</span>
        <button type="button" aria-label="تصويت لأسفل" disabled={busy !== null}
          onClick={() => void send(`vote/${encodeURIComponent(postId)}`, { vote: "down" }, "PUT", `down-${postId}`)}
          style={{ border: "1px solid rgba(229,232,238,.9)", borderRadius: "999px", background: "#fff", padding: ".15rem .55rem" }}>
          ▼
        </button>
        <button type="button" aria-label="تعليق"
          onClick={() => setCommenting((value) => !value)}
          style={{ border: "1px solid rgba(229,232,238,.9)", borderRadius: "999px", background: "#fff", padding: ".15rem .55rem" }}>
          💬
        </button>
      </div>
      {commenting && (
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void send(`comment/${encodeURIComponent(postId)}`, { body: String(form.get("body") || "") }, "POST", `comment-${postId}`);
          event.currentTarget.reset();
          setCommenting(false);
        }} className="mt-2 grid gap-1">
          <textarea name="body" required maxLength={2000} rows={2} aria-label="تعليقك" style={{ ...fieldStyle, fontSize: ".82rem" }} />
          <button type="submit" disabled={busy === `comment-${postId}`} style={{ justifySelf: "end", border: "none", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".3rem .9rem", fontSize: ".78rem" }}>
            {busy === `comment-${postId}` ? "..." : "أرسل التعليق"}
          </button>
        </form>
      )}
      {error ? <p role="alert" className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}
