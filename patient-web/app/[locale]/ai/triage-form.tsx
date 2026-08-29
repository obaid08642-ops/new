"use client";

import { useState } from "react";

type Labels = { placeholder: string; submit: string; submitting: string; error: string; resultTitle: string; disclaimer: string };

function extractReply(payload: unknown): string | null {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const source = root && typeof root.data === "object" && root.data !== null ? root.data as Record<string, unknown> : root;
  if (!source) return null;
  for (const key of ["response", "reply", "answer", "triage", "assessment", "summary"]) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function TriageForm({ labels }: { labels: Labels }) {
  const [symptoms, setSymptoms] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function submit() {
    if (state === "loading" || symptoms.trim().length < 3) return;
    setState("loading"); setReply(null);
    try {
      const response = await fetch("/api/patient/ai/triage", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ symptoms: symptoms.trim(), red_flags: [] }),
      });
      if (!response.ok) throw new Error("triage_unavailable");
      const result = extractReply(await response.json().catch(() => null));
      if (!result) throw new Error("triage_empty");
      setReply(result);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return <div style={{ display: "grid", gap: 12 }}>
    <textarea
      value={symptoms}
      onChange={(e) => setSymptoms(e.target.value)}
      placeholder={labels.placeholder}
      aria-label={labels.placeholder}
      style={{ width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border, #d6dbe3)", fontSize: 15 }}
    />
    <button type="button" onClick={submit} disabled={state === "loading" || symptoms.trim().length < 3} style={{ padding: 12, borderRadius: 12, border: 0, background: "var(--primary, #0d6e56)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
      {state === "loading" ? labels.submitting : labels.submit}
    </button>
    {state === "error" && <p role="alert">{labels.error}</p>}
    {reply && (
      <section style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "14px 16px" }}>
        <h2 style={{ marginTop: 0, fontSize: 17 }}>{labels.resultTitle}</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{reply}</p>
        <p style={{ fontSize: 13, opacity: 0.7 }}>{labels.disclaimer}</p>
      </section>
    )}
  </div>;
}
