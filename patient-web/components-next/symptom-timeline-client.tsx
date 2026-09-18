"use client";

import { useState } from "react";
import { AlertTriangle, Clock, Plus, Sparkles } from "lucide-react";
import styles from "@/app/[locale]/ai/triage.module.css";

export type TimelineEntry = {
  id: string;
  date: string;
  title: string;
  detail?: string;
  kind?: string;
};

function extractReply(payload: unknown): string | null {
  const root =
    payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const source =
    root && typeof root.data === "object" && root.data !== null ? (root.data as Record<string, unknown>) : root;
  if (!source) return null;
  for (const key of ["response", "reply", "answer", "triage", "assessment", "summary"]) {
    const v = source[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

export function SymptomTimelineClient({
  initialEntries,
  locale,
}: {
  initialEntries: TimelineEntry[];
  locale: string;
}) {
  const ar = locale === "ar";
  const [symptoms, setSymptoms] = useState("");
  const [entries, setEntries] = useState<TimelineEntry[]>(initialEntries);
  const [reply, setReply] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function submit() {
    if (state === "loading" || symptoms.trim().length < 3) return;
    setState("loading");
    setReply(null);
    try {
      const response = await fetch("/api/patient/ai/triage", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ symptoms: symptoms.trim(), red_flags: [] }),
      });
      if (!response.ok) throw new Error("triage_unavailable");
      const payload = await response.json().catch(() => null);
      const result = extractReply(payload);
      if (!result) throw new Error("triage_empty");
      setReply(result);
      const now = new Date().toISOString();
      setEntries((prev) => [{ id: crypto.randomUUID(), date: now, title: symptoms.trim().slice(0, 80), detail: result.slice(0, 160), kind: ar ? "الفرز الذكي" : "AI Triage" }, ...prev]);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Add entry — glass, radius 20, blur 16 */}
      <div style={{ display: "grid", gap: 8 }}>
        <p className={styles.promptTitle} style={{ overflowWrap: "anywhere", margin: 0 }}>
          {ar ? "أضف أعراضك إلى الجدول الزمني" : "Add symptoms to your timeline"}
        </p>
        <div className={styles.textareaWrap} style={{ marginBottom: 0 }}>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder={ar ? "مثال: صداع مستمر منذ يومين مع حمى خفيفة..." : "e.g. Persistent headache for 2 days with mild fever..."}
            aria-label={ar ? "وصف الأعراض" : "Describe symptoms"}
            className={styles.textarea}
            style={{ overflowWrap: "anywhere" }}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={state === "loading" || symptoms.trim().length < 3}
          className={styles.submitBtn}
          style={{ background: "#5FD9B3", borderColor: "#E8EDEE", borderRadius: 20 }}
        >
          <Plus size={18} aria-hidden="true" />
          {state === "loading" ? (ar ? "جارٍ الحفظ..." : "Saving...") : ar ? "حفظ في الجدول الزمني" : "Save to timeline"}
        </button>
        {state === "error" && (
          <p role="alert" style={{ color: "#dc2626", fontWeight: 700, margin: "8px 0 0", fontSize: 14, overflowWrap: "anywhere" }}>
            {ar ? "تعذر حفظ الأعراض. حاول مرة أخرى." : "Could not save. Please try again."}
          </p>
        )}
        {reply && (
          <div className={styles.resultCard} style={{ marginTop: 8 }}>
            <p className={styles.resultBody} style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap", margin: 0 }}>{reply}</p>
            <div className={styles.disclaimer} style={{ marginTop: 16, overflowWrap: "anywhere" }}>
              <AlertTriangle size={16} color="#b45309" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ overflowWrap: "anywhere" }}>{ar ? "نتيجة استرشادية لا تغني عن تشخيص الطبيب." : "Advisory result — not a diagnosis. Consult a doctor."}</span>
            </div>
          </div>
        )}
      </div>

      {/* Timeline — 8pt spacing, radius 20, borders #E8EDEE */}
      <div style={{ display: "grid", gap: 8 }}>
        <p className={styles.promptTitle} style={{ overflowWrap: "anywhere", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={14} aria-hidden="true" />
          {ar ? "الجدول الزمني" : "Timeline"} · {entries.length}
        </p>
        {entries.length === 0 ? (
          <div
            style={{
              padding: 16,
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "rgba(255,255,255,0.76)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "#6B7C6E",
              fontSize: 14,
              lineHeight: 1.7,
              overflowWrap: "anywhere",
            }}
          >
            {ar ? "لا توجد أعراض مسجلة بعد. أضف أول إدخال أعلاه." : "No entries yet. Add your first entry above."}
          </div>
        ) : (
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {entries.map((e) => (
              <li
                key={e.id}
                style={{
                  padding: 16,
                  borderRadius: 20,
                  border: "1px solid #E8EDEE",
                  background: "rgba(255,255,255,0.76)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  display: "grid",
                  gap: 8,
                  overflowWrap: "anywhere",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#1E332E",
                      background: "rgba(95,217,179,0.14)",
                      border: "1px solid #E8EDEE",
                      borderRadius: 999,
                      padding: "4px 10px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {e.kind ?? (ar ? "أعراض" : "Symptoms")}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7C6E", overflowWrap: "anywhere" }}>
                    {e.date ? new Date(e.date).toLocaleString(locale) : ""}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1E332E",
                    lineHeight: 1.6,
                    overflowWrap: "anywhere",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {e.title}
                </p>
                {e.detail && (
                  <p style={{ margin: 0, fontSize: 13, color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {e.detail}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "#6B7C6E", lineHeight: 1.6, overflowWrap: "anywhere", display: "flex", gap: 6, alignItems: "flex-start" }}>
        <Sparkles size={12} aria-hidden="true" style={{ flexShrink: 0, marginTop: 3, color: "#1E332E" }} />
        <span style={{ overflowWrap: "anywhere" }}>{ar ? "الجدول الزمني للعرض فقط ويُحفظ عبر الخلفية المصرح بها. لا يقدم تشخيصاً." : "Timeline is read-only and persisted via authorized backend. Not a diagnosis."}</span>
      </p>
    </div>
  );
}
