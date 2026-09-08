"use client";

import { useState } from "react";

export function FamilyInviteClient({ locale }: { locale: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/family/invite", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (locale === "ar" ? "تعذر إنشاء الدعوة" : "Could not create invite"));
        return;
      }
      setCode(String((data as { invite_code?: string })?.invite_code || ""));
    } catch {
      setError(locale === "ar" ? "تعذر إنشاء الدعوة" : "Could not create invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <button onClick={generate} disabled={loading}>{loading ? (locale === "ar" ? "جارٍ الإنشاء…" : "Generating…") : (locale === "ar" ? "إنشاء كود دعوة" : "Generate invite code")}</button>
      {code ? <p role="status" dir="ltr" style={{ fontWeight: 800 }}>{code}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
