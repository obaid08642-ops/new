"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, Sparkles, Stethoscope } from "lucide-react";
import styles from "./triage.module.css";

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

export function TriageForm({ labels, locale }: { labels: Labels; locale?: string }) {
  const [symptoms, setSymptoms] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const sampleChips = locale === "ar"
    ? ["صداع مستمر منذ يومين", "حمى وسعال جاف", "ألم في المعدة وغثيان", "طفح جلدي وحكة"]
    : ["Persistent headache for 2 days", "Fever and dry cough", "Stomach pain and nausea", "Skin rash and itching"];

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

  return (
    <div className={styles.card}>
      <p className={styles.promptTitle}>
        {locale === "ar" ? "أمثلة شائعة يمكنك اختيارها:" : "Common examples to get started:"}
      </p>
      <div className={styles.chips}>
        {sampleChips.map((chip) => (
          <button
            key={chip}
            type="button"
            className={styles.chip}
            onClick={() => setSymptoms((prev) => (prev ? `${prev}، ${chip}` : chip))}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className={styles.textareaWrap}>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className={styles.textarea}
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={state === "loading" || symptoms.trim().length < 3}
        className={styles.submitBtn}
      >
        <Sparkles size={18} aria-hidden="true" />
        {state === "loading" ? labels.submitting : labels.submit}
      </button>

      {state === "error" && (
        <p role="alert" style={{ color: "#dc2626", fontWeight: 700, margin: "14px 0 0", fontSize: 14 }}>
          {labels.error}
        </p>
      )}

      {reply && (
        <section className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <h2 className={styles.resultTitle}>
              <Bot size={20} color="#7c3aed" aria-hidden="true" />
              {labels.resultTitle}
            </h2>
          </div>

          <div className={styles.resultBody}>{reply}</div>

          <div className={styles.disclaimer}>
            <AlertTriangle size={18} color="#b45309" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{labels.disclaimer}</span>
          </div>

          <Link
            href={`/${locale || "ar"}/consultations/doctors`}
            className={styles.doctorAction}
          >
            <Stethoscope size={16} aria-hidden="true" />
            <span>{locale === "ar" ? "استشر طبيباً مختصاً الآن" : "Consult a Doctor Now"}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}
