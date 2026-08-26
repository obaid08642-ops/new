"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/**
 * Wellbeing session completion (parity #19): logs a finished breathing or
 * mindfulness practice through the BFF — the session itself is done by the
 * user; this records it upstream (no simulated timers, no premature success).
 */
export function SessionLogForm({ kind }: { kind: "breathing" | "meditation" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    const payload: Record<string, unknown> = kind === "breathing"
      ? {
          kind: "breathing",
          technique: String(form.get("technique") || ""),
          rounds: Number(form.get("rounds")),
          duration_seconds: Number(form.get("duration_seconds")),
        }
      : {
          kind: "meditation",
          type: String(form.get("type") || ""),
          duration_minutes: Number(form.get("duration_minutes")),
          completed: true,
        };
    setBusy(true); setError(null); setDone(false);
    try {
      const res = await fetch("/api/mental-health/sessions", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر التسجيل");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: ".9rem", display: "grid", gap: ".6rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }} aria-label="تسجيل جلسة">
      <strong>{kind === "breathing" ? "سجّل جلسة تنفّس أكملتها" : "سجّل جلسة يقظة ذهنية أكملتها"}</strong>
      {kind === "breathing" ? (
        <>
          <label className="text-sm">التقنية
            <select name="technique" required style={{ ...fieldStyle, marginTop: ".25rem" }}>
              <option value="box_breathing">تنفس الصندوق</option>
              <option value="4_7_8">4-7-8</option>
              <option value="diaphragmatic">الحجاجي</option>
              <option value="equal_breathing">متساوي</option>
            </select>
          </label>
          <label className="text-sm">الجولات (1-100)
            <input type="number" name="rounds" min={1} max={100} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <label className="text-sm">المدة بالثواني
            <input type="number" name="duration_seconds" min={1} max={7200} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
        </>
      ) : (
        <>
          <label className="text-sm">النوع
            <select name="type" required style={{ ...fieldStyle, marginTop: ".25rem" }}>
              <option value="guided">موجّهة</option>
              <option value="breathing">تنفّس</option>
              <option value="body_scan">مسح جسدي</option>
              <option value="sleep">نوم</option>
              <option value="mindfulness">يقظة</option>
            </select>
          </label>
          <label className="text-sm">المدة بالدقائق (1-180)
            <input type="number" name="duration_minutes" min={1} max={180} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
        </>
      )}
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      {done ? <p role="status" style={{ margin: 0, fontSize: ".82rem", color: "#0b7a53" }}>تم تسجيل الجلسة</p> : null}
      <button type="submit" disabled={busy} style={{ justifySelf: "start", border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
        {busy ? "..." : "تسجيل الجلسة"}
      </button>
    </form>
  );
}
