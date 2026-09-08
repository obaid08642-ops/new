"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FamilyJoinForm({ locale, initialCode }: { locale: string; initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode || "");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 3) {
      setError(locale === "ar" ? "أدخل كود دعوة صحيحاً" : "Enter a valid invite code");
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
        setError((data as { message?: string })?.message || (locale === "ar" ? "تعذر الانضمام" : "Could not join"));
        return;
      }
      router.push(`/${locale}/family`);
      router.refresh();
    } catch {
      setError(locale === "ar" ? "تعذر الانضمام" : "Could not join");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "كود الدعوة" : "Invite code"}</span>
        <input value={code} onChange={(e) => setCode(e.target.value)} required minLength={3} maxLength={64} dir="ltr" />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "صلة القرابة (اختياري)" : "Relation (optional)"}</span>
        <input value={relation} onChange={(e) => setRelation(e.target.value)} maxLength={64} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (locale === "ar" ? "جارٍ الانضمام…" : "Joining…") : (locale === "ar" ? "انضمام للعائلة" : "Join family")}</button>
    </form>
  );
}
