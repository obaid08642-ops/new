"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CommunityCommentForm({ postId, locale }: { postId: string; locale: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (body.trim().length < 1 || body.length > 1000) {
      setError(ar ? "اكتب رسالة بين حرف واحد و1000 حرف." : "Write 1–1000 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "فشل الإرسال" : "Send failed"));
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError(ar ? "فشل الإرسال" : "Send failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "أضف تعليقاً" : "Add a comment"}</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} required />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الإرسال..." : "Sending...") : (ar ? "إرسال" : "Send")}</button>
    </form>
  );
}
