"use client";

import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing } from "lucide-react";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Web-push enable/disable (parity #14): real browser subscription posted to
 * the BFF → /push/web/subscribe. Deep-links ride on data.url handled by sw.js.
 */
export function PushEnableButton() {
  const [state, setState] = useState<"unsupported" | "loading" | "off" | "on" | "busy">("loading");
  const [error, setError] = useState<string | null>(null);

  const currentSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? await reg.pushManager.getSubscription() : null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) { if (!cancelled) setState("unsupported"); return; }
      const sub = await currentSubscription();
      if (!cancelled) setState(sub ? "on" : "off");
    })();
    return () => { cancelled = true; };
  }, [currentSubscription]);

  async function enable() {
    setError(null); setState("busy");
    try {
      const keyRes = await fetch("/api/push/vapid-key");
      const keyData = await keyRes.json().catch(() => ({}));
      const publicKey = keyData?.public_key;
      if (!keyRes.ok || typeof publicKey !== "string" || !publicKey) {
        setError("إشعارات الويب غير مهيأة على الخادم بعد");
        setState("off");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("off"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : "تعذر تسجيل الإشعارات");
        setState("off");
        return;
      }
      setState("on");
    } catch {
      setError("تعذر تفعيل الإشعارات في هذا المتصفح");
      setState("off");
    }
  }

  async function disable() {
    setError(null); setState("busy");
    try {
      const sub = await currentSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => null);
        await sub.unsubscribe().catch(() => null);
      }
      setState("off");
    } catch {
      setError("تعذر إيقاف الإشعارات");
      setState("on");
    }
  }

  if (state === "unsupported" || state === "loading") return null;
  const on = state === "on";
  return (
    <section style={{ marginTop: ".9rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: ".9rem 1rem", display: "grid", gap: ".5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", color: "var(--ink)", fontWeight: 600 }}>
        {on ? <BellRing size={17} aria-hidden="true" /> : <BellOff size={17} aria-hidden="true" />}
        إشعارات المتصفح {on ? "مفعّلة" : "غير مفعّلة"}
      </div>
      <p style={{ margin: 0, fontSize: ".8rem", color: "var(--muted)" }}>
        استلم تنبيهات المواعيد والعروض وطلبات التأمين حتى والصفحة مغلقة — الروابط تفتح الصفحة المعنية مباشرة.
      </p>
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      <button type="button" onClick={on ? disable : enable} disabled={state === "busy"}
        style={{ justifySelf: "start", border: "none", cursor: state === "busy" ? "wait" : "pointer", borderRadius: "999px", background: on ? "#334155" : "#087f8c", color: "#fff", fontWeight: 700, padding: ".6rem 1.2rem" }}>
        {state === "busy" ? "جارٍ التنفيذ..." : on ? "إيقاف الإشعارات" : "تفعيل الإشعارات"}
      </button>
    </section>
  );
}
