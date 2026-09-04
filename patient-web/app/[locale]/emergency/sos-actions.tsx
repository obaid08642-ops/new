"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Siren } from "lucide-react";
import styles from "./emergency.module.css";

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
    return (
      <section className={styles.activeAlert}>
        <h2 className={styles.activeTitle}>
          <Siren size={24} color="#dc2626" aria-hidden="true" />
          {labels.active}
        </h2>
        <p className={styles.activeDesc}>
          {labels.state}: <strong>{active.state}</strong>
        </p>
        <button
          type="button"
          onClick={cancel}
          disabled={state === "loading"}
          className={styles.cancelBtn}
        >
          {state === "loading" ? labels.cancelling : labels.cancel}
        </button>
        {state === "error" && <p role="alert" style={{ color: "#b91c1c", fontWeight: 700, margin: 0 }}>{labels.error}</p>}
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {!confirming ? (
        <div className={styles.sosButtonWrap}>
          <div className={styles.sosPulse} />
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={styles.sosBtn}
            aria-label={labels.trigger}
          >
            <Siren size={36} aria-hidden="true" />
            <span className={styles.sosText}>SOS</span>
            <span className={styles.sosSubtext}>{labels.trigger}</span>
          </button>
        </div>
      ) : (
        <div className={styles.activeAlert} style={{ background: "#fff" }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#16213a" }}>
            {labels.trigger}؟
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#526473" }}>
            سيتم إرسال موقعك الجغرافي فوراً لفرق الطوارئ والاستجابة السريعة
          </p>
          <div style={{ display: "flex", gap: 12, width: "100%", justifyContent: "center" }}>
            <button
              type="button"
              onClick={trigger}
              disabled={state === "loading"}
              style={{
                padding: "12px 28px",
                borderRadius: 14,
                border: 0,
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(185, 28, 28, 0.35)",
              }}
            >
              {state === "loading" ? labels.triggering : "تأكيد طلب الإسعاف"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={state === "loading"}
              style={{
                padding: "12px 20px",
                borderRadius: 14,
                border: "1px solid #d9e4ea",
                background: "#f8fafc",
                color: "#526473",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}

      {state === "error" && <p role="alert" style={{ color: "#dc2626", fontWeight: 700, margin: 0 }}>{labels.error}</p>}

      <div className={styles.hotlinesGrid}>
        <a href="tel:997" className={styles.hotlineCard}>
          <div>
            <div className={styles.hotlineTitle}>الهلال الأحمر السعودي</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Red Crescent Ambulance</div>
          </div>
          <span className={styles.hotlineNumber}>997</span>
        </a>
        <a href="tel:911" className={styles.hotlineCard}>
          <div>
            <div className={styles.hotlineTitle}>طوارئ العمليات الموحدة</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Unified Emergency (911)</div>
          </div>
          <span className={styles.hotlineNumber}>911</span>
        </a>
      </div>
    </section>
  );
}
