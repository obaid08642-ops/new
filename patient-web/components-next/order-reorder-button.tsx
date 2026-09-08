"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderReorderButton({ orderId, locale }: { orderId: string; locale: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/reorder`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `reorder-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
        body: "{}",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (locale === "ar" ? "تعذر إعادة الطلب" : "Could not reorder"));
        return;
      }
      const nextId = (data as { id?: string; orderId?: string })?.id || (data as { orderId?: string })?.orderId;
      if (nextId) router.push(`/${locale}/orders/${nextId}`);
      router.refresh();
    } catch {
      setError(locale === "ar" ? "تعذر إعادة الطلب" : "Could not reorder");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span style={{ display: "inline-grid", gap: 6 }}>
      <button onClick={onClick} disabled={saving}>{saving ? (locale === "ar" ? "جارٍ إعادة الطلب…" : "Reordering…") : (locale === "ar" ? "إعادة الطلب" : "Reorder")}</button>
      {error ? <span role="alert">{error}</span> : null}
    </span>
  );
}
