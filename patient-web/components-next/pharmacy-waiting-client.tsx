"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LoaderCircle } from "lucide-react";

const CANCELLABLE = new Set(["CANCELLED", "DELIVERED", "COMPLETED"]);

function parseOrder(payload: unknown): { state: string; status: string } | null {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  return {
    state: typeof r.governed_state === "string" ? r.governed_state : "",
    status: typeof r.status === "string" ? r.status : "",
  };
}

export function PharmacyWaitingClient({ orderId, locale }: { orderId: string; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [state, setState] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(ar ? "تعذر تحميل حالة الطلب" : "Could not load order status"); return; }
      const parsed = parseOrder(await res.json().catch(() => null));
      if (!parsed) { setError(ar ? "تعذر تحميل حالة الطلب" : "Could not load order status"); return; }
      setState(parsed.state); setStatus(parsed.status);
      if (parsed.state === "OFFERS_READY") router.replace(`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(orderId)}`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setLoading(false); }
  }, [orderId, locale, router, ar]);

  async function cancel() {
    if (!window.confirm(ar ? "تأكيد إلغاء الطلب؟" : "Confirm order cancellation?")) return;
    setCancelling(true); setError(null);
    try {
      const res = await fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-pharmacy-cancel-${orderId}-${Date.now()}` },
        body: JSON.stringify({ reason: "patient_requested" }),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر إلغاء الطلب" : "Could not cancel order"); return; }
      router.replace(`/${locale}/pharmacy`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setCancelling(false); }
  }

  const copy = state === "ORDER_BROADCASTING"
    ? (ar ? "تم بث طلبك على الصيدليات القريبة…" : "Your order was broadcast to nearby pharmacies…")
    : state === "OFFERS_READY"
      ? (ar ? "وصلت عروض الصيدليات!" : "Pharmacy offers arrived!")
      : state
        ? (ar ? `حالة الطلب الحاكمة: ${state}` : `Governing order state: ${state}`)
        : (ar ? "انتظار عروض الصيدليات" : "Waiting for pharmacy offers");
  const canCancel = state !== null && !CANCELLABLE.has(status);

  return (
    <div>
      <p role="status">{loading && state === null ? <LoaderCircle size={18} aria-hidden="true" /> : null} {copy}</p>
      <p>{ar ? "لا توجد متابعة تلقائية — حدّث الحالة يدوياً." : "No automatic tracking — refresh the status manually."}</p>
      {error ? <p role="alert">{error}</p> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={load} disabled={loading}>{ar ? "تحديث حالة البث يدوياً" : "Refresh broadcast status manually"}</button>
        {state === "OFFERS_READY" ? (
          <Link href={`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(orderId)}`}>{ar ? "مراجعة عروض الصيدليات" : "Review pharmacy offers"}</Link>
        ) : null}
        {canCancel ? <button type="button" onClick={cancel} disabled={cancelling}>{ar ? "إلغاء الطلب" : "Cancel order"}</button> : null}
      </div>
    </div>
  );
}
