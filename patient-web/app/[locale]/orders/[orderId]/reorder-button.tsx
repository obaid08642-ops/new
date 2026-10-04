"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

// Q16: the governed reorder (POST /orders/:id/reorder) answers with the new draft.
// Every field is null-guarded (Q25 crash class): no property access on unknown shapes.
function extractDraftId(payload: unknown): string | null {
  const root = asRecord(payload);
  if (!root) return null;
  const sources = [asRecord(root.data), asRecord(root.order), asRecord(root.draft), root];
  for (const source of sources) {
    if (!source) continue;
    for (const key of ["id", "orderId", "order_id", "draftId", "draft_id"]) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

// Colocated with the order detail page: calls the governed reorder proxy
// (/api/orders/:id/reorder -> POST /orders/:id/reorder, never the legacy path),
// navigates to the new draft on success, and shows a graceful error on 404/4xx.
export function ReorderButton({ orderId, locale }: { orderId: string; locale: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ar = locale === "ar";

  async function onClick() {
    if (saving) return;
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
      if (res.status === 404) {
        setError(ar ? "الطلب غير موجود — لا يمكن إعادة الطلب" : "Order not found — cannot reorder");
        return;
      }
      if (!res.ok) {
        const message = asRecord(data)?.message;
        setError(
          typeof message === "string" && message.trim()
            ? message
            : ar ? "تعذر إعادة الطلب" : "Could not reorder",
        );
        return;
      }
      const nextId = extractDraftId(data);
      // New draft id -> open it directly; the proxy strips the body ({ ok: true })
      // -> fall back to the orders list, where the new draft is listed.
      router.push(nextId ? `/${locale}/orders/${encodeURIComponent(nextId)}` : `/${locale}/orders`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر الاتصال — حاول مجدداً" : "Connection unavailable — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span style={{ display: "inline-grid", gap: 6 }}>
      <button type="button" onClick={onClick} disabled={saving}>
        {saving ? (ar ? "جارٍ إعادة الطلب…" : "Reordering…") : (ar ? "إعادة الطلب" : "Reorder")}
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </span>
  );
}
