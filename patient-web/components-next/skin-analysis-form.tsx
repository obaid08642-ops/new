"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Sparkles, Stethoscope } from "lucide-react";
import styles from "@/app/[locale]/ai/triage.module.css";

const AREAS = ["face", "scalp", "hands", "body"] as const;
const OBSERVATIONS = ["redness", "itching", "dryness", "rash", "swelling", "none"] as const;

function extractResult(payload: unknown): string | null {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const source = root && typeof root.data === "object" && root.data !== null ? (root.data as Record<string, unknown>) : root;
  if (!source) return null;
  for (const key of ["result", "summary", "analysis", "assessment", "reply", "response", "answer"]) {
    const v = source[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  // fallback: pretty json if structured but no string field
  if (source && Object.keys(source).length) return JSON.stringify(source, null, 2);
  return null;
}

export function SkinAnalysisForm({ locale }: { locale: string }) {
  const [areas, setAreas] = useState<string[]>([]);
  const [observations, setObservations] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [acked, setAcked] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!areas.length) {
      setError(ar ? "اختر منطقة واحدة على الأقل" : "Select at least one area");
      return;
    }
    if (!acked) {
      setError(ar ? "أقر بأن هذه نتيجة استرشادية لا تغني عن الطبيب" : "Acknowledge this is advisory only");
      return;
    }
    setSaving(true);
    try {
      // backend binding: /api/patient/ai/skin-analysis → callPatientApi("/ai/skin-analysis") — no mock
      const res = await fetch("/api/patient/ai/skin-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          acknowledge_limitations: true,
          areas,
          observations: observations.length ? observations : ["none"],
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر التحليل" : "Analysis failed"));
        return;
      }
      const extracted = extractResult(data);
      setResult(extracted ?? JSON.stringify(data, null, 2));
    } catch {
      setError(ar ? "تعذر التحليل" : "Analysis failed");
    } finally {
      setSaving(false);
    }
  }

  const chipActive: React.CSSProperties = {
    borderColor: "#5FD9B3",
    background: "rgba(95,217,179,0.16)",
    color: "#1E332E",
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
      <div>
        <p className={styles.promptTitle} style={{ overflowWrap: "anywhere" }}>
          {ar ? "المنطقة" : "Area"}
        </p>
        <div className={styles.chips}>
          {AREAS.map((a) => {
            const active = areas.includes(a);
            return (
              <button
                key={a}
                type="button"
                className={styles.chip}
                style={active ? chipActive : undefined}
                aria-pressed={active}
                onClick={() => toggle(areas, a, setAreas)}
              >
                <span style={{ overflowWrap: "anywhere" }}>{a}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={styles.promptTitle} style={{ overflowWrap: "anywhere" }}>
          {ar ? "الملاحظات" : "Observations"}
        </p>
        <div className={styles.chips}>
          {OBSERVATIONS.map((o) => {
            const active = observations.includes(o);
            return (
              <button
                key={o}
                type="button"
                className={styles.chip}
                style={active ? chipActive : undefined}
                aria-pressed={active}
                onClick={() => toggle(observations, o, setObservations)}
              >
                <span style={{ overflowWrap: "anywhere" }}>{o}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 750, color: "#6B7C6E", overflowWrap: "anywhere" }}>
          {ar ? "ملاحظة (اختياري)" : "Note (optional)"}
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={ar ? "صف الأعراض بإيجاز..." : "Describe briefly..."}
          className={styles.textarea}
          style={{ overflowWrap: "anywhere" }}
        />
      </label>

      <label
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          padding: "12px 16px",
          borderRadius: 20,
          border: "1px solid #E8EDEE",
          background: "#FDFDFC",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={acked}
          onChange={(e) => setAcked(e.target.checked)}
          style={{ marginTop: 4, accentColor: "#5FD9B3" }}
        />
        <span style={{ fontSize: 13, lineHeight: 1.6, color: "#1E332E", overflowWrap: "anywhere" }}>
          {ar ? "أقر بأن النتيجة استرشادية ولا تغني عن تشخيص الطبيب" : "I acknowledge this is advisory and not a diagnosis"}
        </span>
      </label>

      {error ? (
        <p role="alert" style={{ color: "#dc2626", fontWeight: 700, margin: 0, fontSize: 14, overflowWrap: "anywhere" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={saving} className={styles.submitBtn} style={{ overflowWrap: "anywhere" }}>
        <Sparkles size={18} aria-hidden="true" />
        {saving ? (ar ? "جارٍ التحليل..." : "Analyzing...") : ar ? "تحليل" : "Analyze"}
      </button>

      {result ? (
        <section
          className={styles.resultCard}
          style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          <div className={styles.resultHeader}>
            <h2 className={styles.resultTitle} style={{ overflowWrap: "anywhere" }}>
              <Stethoscope size={18} color="#1E332E" aria-hidden="true" />
              <span
                style={{
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {ar ? "النتيجة الاسترشادية" : "Advisory result"}
              </span>
            </h2>
          </div>
          <p className={styles.resultBody} style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
            {result}
          </p>
          <div className={styles.disclaimer} style={{ overflowWrap: "anywhere" }}>
            <AlertTriangle size={16} color="#b45309" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ overflowWrap: "anywhere" }}>
              {ar ? "نتيجة استرشادية لا تغني عن تشخيص الطبيب." : "Advisory result; not a diagnosis."}
            </span>
          </div>
          <Link
            href={`/${locale}/consultations/doctors`}
            className={styles.doctorAction}
            style={{ overflowWrap: "anywhere" }}
          >
            <Stethoscope size={16} aria-hidden="true" />
            <span style={{ overflowWrap: "anywhere" }}>{ar ? "استشر طبيباً الآن" : "Consult a doctor"}</span>
          </Link>
        </section>
      ) : null}
    </form>
  );
}
