"use client";

import { useState } from "react";

export function FamilyInviteClient({ locale }: { locale: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ar = locale === "ar";

  async function generate() {
    setError(null);
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/family/invite", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر إنشاء الدعوة" : "Could not create invite"));
        return;
      }
      setCode(String((data as { invite_code?: string })?.invite_code || ""));
    } catch {
      setError(ar ? "تعذر إنشاء الدعوة" : "Could not create invite");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 16,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 24px rgba(30,51,46,0.07)",
        }}
      >
        <p style={{ margin: 0, color: "#64748B", fontSize: ".9rem", lineHeight: 1.6, overflowWrap: "anywhere" }}>
          {ar ? "سيُنشئ الخادم كودًا صالحًا للمشاركة مع فرد العائلة." : "The server will generate a shareable invite code."}
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          style={{
            padding: "12px 20px",
            borderRadius: 20,
            border: "1px solid #E8EDEE",
            background: "#5FD9B3",
            color: "#1E332E",
            fontWeight: 800,
            fontSize: ".95rem",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
            inlineSize: "fit-content",
          }}
        >
          {loading ? (ar ? "جارٍ الإنشاء…" : "Generating…") : ar ? "إنشاء كود دعوة" : "Generate invite code"}
        </button>
        {code ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: 16,
              border: "1px dashed #E8EDEE",
              borderRadius: 16,
              background: "#FDFDFC",
            }}
          >
            <span style={{ color: "#64748B", fontSize: ".78rem", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
              {ar ? "كود الدعوة" : "Invite code"}
            </span>
            <p
              role="status"
              dir="ltr"
              style={{
                margin: 0,
                color: "#1E332E",
                fontWeight: 800,
                fontSize: "1.15rem",
                letterSpacing: ".06em",
                overflowWrap: "anywhere",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {code}
            </p>
            <button
              type="button"
              onClick={copy}
              style={{
                justifySelf: "start",
                padding: "8px 14px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "#FDFDFC",
                color: "#1E332E",
                fontWeight: 700,
                fontSize: ".85rem",
                cursor: "pointer",
              }}
            >
              {copied ? (ar ? "تم النسخ" : "Copied") : ar ? "نسخ الكود" : "Copy code"}
            </button>
          </div>
        ) : null}
        {error ? (
          <p role="alert" style={{ margin: 0, color: "#B42318", background: "#FDFDFC", border: "1px solid #E8EDEE", borderRadius: 16, padding: 16, overflowWrap: "anywhere", fontSize: ".9rem" }}>
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
