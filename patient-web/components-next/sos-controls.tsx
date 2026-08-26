"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * SOS controls (parity #30): triggers a real emergency record upstream
 * (optionally with geolocation), or cancels the active one. Status text is
 * always what the server returned — no simulated dispatch.
 */
export function SosControls({ activeId }: { activeId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function trigger(withLocation: boolean) {
    if (busy) return;
    setBusy("trigger"); setError(null); setMessage(null);
    try {
      let location: { lat: number; lng: number } | undefined;
      if (withLocation && navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }),
            () => resolve(undefined),
            { timeout: 5000 },
          );
        });
      }
      const res = await fetch("/api/emergency/trigger", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ severity: "critical", ...(location ? { location } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر إرسال نداء الطوارئ");
        return;
      }
      setMessage(`تم إرسال نداء الطوارئ${data?.id ? ` (${String(data.id).slice(0, 8)})` : ""} — فريق الإسعاف يتلقى الطلب الآن`);
      router.refresh();
    } catch {
      setError("تعذر الاتصال — اتصل بالطوارئ مباشرة");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (busy || !activeId) return;
    setBusy("cancel"); setError(null);
    try {
      const res = await fetch(`/api/emergency/cancel/${encodeURIComponent(activeId)}`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ reason: "patient_cancelled" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "تعذر الإلغاء");
        return;
      }
      setMessage("تم إلغاء النداء");
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: ".5rem" }}>
      {!activeId && (
        <button type="button" onClick={() => void trigger(true)} disabled={busy === "trigger"}
          aria-label="نداء طوارئ مع الموقع"
          style={{ border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "1rem", background: "#d64550", color: "#fff", fontWeight: 800, fontSize: "1.05rem", padding: "1.2rem 1.5rem" }}>
          {busy === "trigger" ? "جارٍ إرسال النداء..." : "🚨 نداء طوارئ الآن (مع الموقع)"}
        </button>
      )}
      {!activeId && (
        <button type="button" onClick={() => void trigger(false)} disabled={busy === "trigger"}
          className="justify-self-start"
          style={{ border: "1px solid rgba(229,232,238,.9)", borderRadius: "999px", background: "#fff", fontWeight: 700, padding: ".5rem 1rem", fontSize: ".85rem" }}>
          إرسال بلا مشاركة الموقع
        </button>
      )}
      {activeId && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
          <p>لديك نداء طوارئ نشط ({activeId.slice(0, 8)}) — التتبع يظهر في تطبيق الجوال وفريق العمليات.</p>
          <button type="button" onClick={cancel} disabled={busy === "cancel"}
            className="mt-2 rounded-full border border-black/15 bg-white px-4 py-1.5 font-bold">
            {busy === "cancel" ? "..." : "إلغاء النداء"}
          </button>
        </div>
      )}
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      {message ? <p role="status" style={{ margin: 0, fontSize: ".82rem", color: "#0b7a53" }}>{message}</p> : null}
    </div>
  );
}
