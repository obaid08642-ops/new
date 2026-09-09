"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefillButton({ reminderId, locale }: { reminderId: string; locale: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function onRefill() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/health/reminders/${encodeURIComponent(reminderId)}/refill`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر طلب إعادة الصرف" : "Could not request refill"));
        return;
      }
      router.refresh();
    } catch {
      setError(ar ? "تعذر طلب إعادة الصرف" : "Could not request refill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span style={{ display: "inline-grid", gap: 4 }}>
      <button type="button" onClick={onRefill} disabled={saving}>
        {saving ? (ar ? "جارٍ..." : "Working...") : (ar ? "طلب إعادة صرف" : "Request refill")}
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </span>
  );
}
