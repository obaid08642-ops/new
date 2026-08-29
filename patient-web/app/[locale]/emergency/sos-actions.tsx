"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ActiveSos = { id: string; state: string; createdAt?: string };

type Labels = { trigger: string; triggering: string; active: string; cancel: string; cancelling: string; error: string; state: string };

export function SosActions({ active, labels }: { active: ActiveSos | null; labels: Labels }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [confirming, setConfirming] = useState(false);

  async function trigger() {
    if (state === "loading") return;
    setState("loading");
    try {
      let location: { lat: number; lng: number } | undefined;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation ? navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }) : reject(new Error("no_geolocation")),
        );
        location = { lat: position.coords.latitude, lng: position.coords.longitude };
      } catch {
        location = undefined; // SOS must never fail because location was unavailable
      }
      const response = await fetch("/api/patient/emergency/trigger", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ location, severity: "critical" }),
      });
      if (!response.ok) throw new Error("sos_failed");
      setState("idle"); setConfirming(false);
      router.refresh();
    } catch {
      setState("error");
    }
  }

  async function cancel() {
    if (state === "loading" || !active) return;
    setState("loading");
    try {
      const response = await fetch(`/api/patient/emergency/${encodeURIComponent(active.id)}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("cancel_failed");
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  if (active) {
    return <section style={{ border: "2px solid #b3261e", borderRadius: 16, padding: 24, display: "grid", gap: 12 }}>
      <p role="status" style={{ color: "#b3261e", fontWeight: 700, fontSize: 18, margin: 0 }}>{labels.active}</p>
      <p style={{ margin: 0, opacity: 0.75 }}>{labels.state}: {active.state}</p>
      <button type="button" onClick={cancel} disabled={state === "loading"} style={{ padding: 12, borderRadius: 12, border: "1px solid #b3261e", background: "#fff", color: "#b3261e", fontWeight: 700, cursor: "pointer" }}>
        {state === "loading" ? labels.cancelling : labels.cancel}
      </button>
      {state === "error" && <p role="alert">{labels.error}</p>}
    </section>;
  }

  return <section style={{ display: "grid", gap: 12 }}>
    {!confirming ? (
      <button type="button" onClick={() => setConfirming(true)} style={{ padding: 24, borderRadius: 16, border: 0, background: "#b3261e", color: "#fff", fontWeight: 800, fontSize: 20, cursor: "pointer" }}>
        {labels.trigger}
      </button>
    ) : (
      <div style={{ border: "2px solid #b3261e", borderRadius: 16, padding: 24, display: "grid", gap: 12 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>{labels.trigger}?</p>
        <button type="button" onClick={trigger} disabled={state === "loading"} style={{ padding: 16, borderRadius: 12, border: 0, background: "#b3261e", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
          {state === "loading" ? labels.triggering : labels.trigger}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={state === "loading"} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border, #d6dbe3)", background: "transparent", cursor: "pointer" }}>
          {labels.cancel}
        </button>
      </div>
    )}
    {state === "error" && <p role="alert">{labels.error}</p>}
  </section>;
}
