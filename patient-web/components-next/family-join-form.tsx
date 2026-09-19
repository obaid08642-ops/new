"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FamilyJoinForm({ locale, initialCode }: { locale: string; initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode || "");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 3) {
      setError(ar ? "أدخل كود دعوة صحيحاً" : "Enter a valid invite code");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/family/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim(), relation: relation.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر الانضمام" : "Could not join"));
        return;
      }
      router.push(`/${locale}/family`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر الانضمام" : "Could not join");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    inlineSize: "100%",
    padding: "12px 14px",
    border: "1px solid #E8EDEE",
    borderRadius: 16,
    background: "#FDFDFC",
    color: "#1E332E",
    fontSize: ".95rem",
    outline: "none",
  };

  return (
    <form
      onSubmit={onSubmit}
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
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ color: "#1E332E", fontSize: ".88rem", fontWeight: 700, overflowWrap: "anywhere" }}>{ar ? "كود الدعوة" : "Invite code"}</span>
        <input value={code} onChange={(e) => setCode(e.target.value)} required minLength={3} maxLength={64} dir="ltr" placeholder={ar ? "الصق الكود هنا" : "Paste code here"} style={inputStyle} />
      </label>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ color: "#1E332E", fontSize: ".88rem", fontWeight: 700, overflowWrap: "anywhere" }}>{ar ? "صلة القرابة (اختياري)" : "Relation (optional)"}</span>
        <input value={relation} onChange={(e) => setRelation(e.target.value)} maxLength={64} placeholder={ar ? "مثال: أخ، أم" : "e.g. brother, mother"} style={inputStyle} />
      </label>
      {error ? <p role="alert" style={{ margin: 0, color: "#B42318", background: "#FDFDFC", border: "1px solid #E8EDEE", borderRadius: 16, padding: 16, overflowWrap: "anywhere", fontSize: ".9rem" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "12px 20px",
          borderRadius: 20,
          border: "1px solid #E8EDEE",
          background: "#5FD9B3",
          color: "#1E332E",
          fontWeight: 800,
          fontSize: ".95rem",
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? (ar ? "جارٍ الانضمام…" : "Joining…") : ar ? "انضمام للعائلة" : "Join family"}
      </button>
    </form>
  );
}
