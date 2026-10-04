"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Labels = { submit: string; submitting: string; failed: string };

// 7cf3e9f: a reorder opens a draft; this sends it to the pharmacies
// (POST /api/patient/pharmacy/orders/:id/submit), as the app does.
export function SubmitDraftButton({ orderId, labels }: { orderId: string; labels: Labels }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patient/pharmacy/orders/${encodeURIComponent(orderId)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-submit-${orderId}-${crypto.randomUUID()}` },
        body: "{}",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data && typeof data === "object" ? (data as { message?: unknown }).message : null;
        setError(typeof message === "string" && message.trim() ? message : labels.failed);
        return;
      }
      router.refresh();
    } catch {
      setError(labels.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span style={{ display: "inline-grid", gap: 6 }}>
      <button type="button" onClick={onClick} disabled={saving}>{saving ? labels.submitting : labels.submit}</button>
      {error ? <span role="alert">{error}</span> : null}
    </span>
  );
}
