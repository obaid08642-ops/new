"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["consultation", "pharmacy", "lab", "radiology", "nursing", "hospitalization", "dental", "optical"] as const;

export function InsuranceSubmitClaimForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [claimType, setClaimType] = useState<(typeof TYPES)[number]>("consultation");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/insurance/claims", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `${Date.now()}-${Math.random().toString(36).slice(2)}-${claimType}`.slice(0, 64),
        },
        body: JSON.stringify({ claim_type: claimType, description }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (locale === "ar" ? "تعذر تقديم المطالبة" : "Could not submit claim"));
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError(locale === "ar" ? "تعذر تقديم المطالبة" : "Could not submit claim");
    } finally {
      setSaving(false);
    }
  }

  if (done) return <p role="status">{locale === "ar" ? "تم تقديم المطالبة — ستتم مراجعتها خلال 2-5 أيام عمل." : "Claim submitted — review takes 2-5 business days."}</p>;

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "نوع المطالبة" : "Claim type"}</span>
        <select value={claimType} onChange={(e) => setClaimType(e.target.value as (typeof TYPES)[number])}>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "وصف (اختياري)" : "Description (optional)"}</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (locale === "ar" ? "جارٍ الإرسال…" : "Submitting…") : (locale === "ar" ? "تقديم المطالبة" : "Submit claim")}</button>
    </form>
  );
}
