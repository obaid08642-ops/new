"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Program actions (parity #29): enroll into a program or mark a pending
 * session complete — real BFF posts over /medical/programs/*.
 */
export function ProgramActions({ programType, sessions }: { programType: string; sessions: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrollType, setEnrollType] = useState("diabetes");

  async function act(action: "enroll" | "complete", payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(action); setError(null);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ kind: action === "enroll" ? "enroll" : "complete-session", ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر التنفيذ");
        return;
      }
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: ".5rem", marginTop: ".6rem", fontSize: ".85rem" }}>
      {!programType && (
        <label>
          البرنامج
          <select value={enrollType} onChange={(event) => setEnrollType(event.target.value)} style={{ display: "block", marginTop: ".25rem", width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem" }}>
            <option value="diabetes">السكري</option>
            <option value="hypertension">ضغط الدم</option>
            <option value="pregnancy">الحمل</option>
          </select>
        </label>
      )}
      <button type="button"
        onClick={() => { if (!programType) void act("enroll", { programType: enrollType }); }}
        hidden={Boolean(programType)}
        disabled={busy === "enroll"}
        style={{ justifySelf: "start", border: "none", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".5rem 1.1rem" }}>
        {busy === "enroll" ? "..." : "تسجيل"}
      </button>
      {sessions.map((sessionId) => (
        <button key={sessionId} type="button"
          onClick={() => act("complete", { programType, sessionId })}
          disabled={busy === `s:${sessionId}`}
          style={{ justifySelf: "start", border: "1px solid rgba(229,232,238,.9)", borderRadius: "999px", background: "#f0fdfa", color: "#087f8c", fontWeight: 700, padding: ".4rem 1rem" }}>
          {busy === `s:${sessionId}` ? "..." : `إكمال الجلسة ${sessionId.slice(0, 8)}`}
        </button>
      ))}
      {error ? <p role="alert" style={{ margin: 0, color: "#c0392b" }}>{error}</p> : null}
    </div>
  );
}
