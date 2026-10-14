"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { CONSULT, Notice } from "@/components-next/consult/consult-parts";
import forms from "@/components-next/consult/consult.module.css";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { MIN_SYMPTOMS_LENGTH, RED_FLAGS, parseTriageHistory, triageCareLevel, triageRequestBody, triageSpecialty, type CareLevel, type PastTriage, type RedFlag } from "@/lib/ai/assistant";
import { AnswerCard, AskedBubble } from "./assistant-kit";
import styles from "./assistant.module.css";

type Phase = { kind: "idle" } | { kind: "loading" } | { kind: "failed" } | { kind: "answered"; asked: string; level: CareLevel; specialty: string | null };

const EXAMPLES = ["example1", "example2", "example3", "example4"] as const;

/**
 * Mode 1, "describe my symptoms": POST /api/patient/ai/triage (the endpoint the old triage screens called) with the text and the
 * red flags the person ticked. The answer is the server's `care_level`; the words come from the message files. No diagnosis, no
 * dose. An emergency answer shows the urgent-help page first (number from the admin config); the book button opens the doctor list
 * on the server's `specialty` when it names one. Earlier questions come from GET /ai/triage/history.
 */
export function SymptomsClient() {
  const t = useTranslations("AssistantWeb");
  const locale = useLocale();
  const [symptoms, setSymptoms] = useState("");
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [past, setPast] = useState<PastTriage[]>([]);
  const loading = phase.kind === "loading";
  const ready = symptoms.trim().length >= MIN_SYMPTOMS_LENGTH && !loading;

  useEffect(() => {
    let live = true;
    fetch("/api/patient/ai/triage/history?limit=20", { credentials: "same-origin" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => { if (live) setPast(parseTriageHistory(payload)); })
      .catch(() => { /* the history is secondary: the form still works without it */ });
    return () => { live = false; };
  }, []);

  function toggleFlag(flag: RedFlag) {
    setFlags((current) => (current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]));
  }

  async function submit() {
    if (!ready) return;
    const asked = symptoms.trim();
    setPhase({ kind: "loading" });
    try {
      const response = await fetch("/api/patient/ai/triage", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        body: JSON.stringify(triageRequestBody(asked, flags)),
      });
      if (!response.ok) throw new Error("triage_unavailable");
      const payload = await response.json().catch(() => null);
      const level = triageCareLevel(payload);
      if (!level) throw new Error("triage_empty");
      setPhase({ kind: "answered", asked, level, specialty: triageSpecialty(payload) });
    } catch {
      setPhase({ kind: "failed" });
    }
  }

  function again() {
    setSymptoms("");
    setFlags([]);
    setPhase({ kind: "idle" });
  }

  const history = past.length > 0 ? (
    <section className={styles.thread} aria-labelledby="assistant-history">
      <h2 className={forms.label} id="assistant-history">{t("historyTitle")}</h2>
      {past.map((item, index) => (
        <div key={index} className={styles.thread}>
          <AskedBubble text={item.asked} label={t("askedLabel")} />
          <TriageAnswer level={item.level} specialty={item.specialty} />
        </div>
      ))}
    </section>
  ) : null;

  if (phase.kind === "answered") {
    return (
      <div className={styles.thread}>
        <AskedBubble text={phase.asked} label={t("askedLabel")} />
        <TriageAnswer level={phase.level} specialty={phase.specialty} again={again} />
        {history}
      </div>
    );
  }

  return (
    <>
    <form
      className={styles.thread}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className={forms.field}>
        <span className={forms.label} id="assistant-examples">{t("examplesLabel")}</span>
        <div className={forms.choices} role="group" aria-labelledby="assistant-examples">
          {EXAMPLES.map((key) => (
            <button key={key} type="button" className={forms.choice} onClick={() => setSymptoms((current) => (current ? `${current}, ${t(key)}` : t(key)))}>
              {t(key)}
            </button>
          ))}
        </div>
      </div>
      <label className={forms.field}>
        <span className={forms.label}>{t("symptomsLabel")}</span>
        <textarea className={forms.control} rows={5} value={symptoms} maxLength={1000} placeholder={t("symptomsPlaceholder")} onChange={(event) => setSymptoms(event.target.value)} dir="auto" />
      </label>
      <fieldset className={forms.fieldset}>
        <legend className={forms.label}>{t("flagsLegend")}</legend>
        <div className={forms.choices}>
          {RED_FLAGS.map((flag) => (
            <button key={flag} type="button" className={forms.choice} aria-pressed={flags.includes(flag)} onClick={() => toggleFlag(flag)}>
              {t(`flag.${flag}`)}
            </button>
          ))}
        </div>
      </fieldset>
      {phase.kind === "failed" ? <div role="alert"><Notice warn>{t("error")}</Notice></div> : null}
      <Button type="submit" label={loading ? t("submitting") : t("submit")} fullWidth size="lg" disabled={!ready} loading={loading} startIcon="sparkle" />
    </form>
    {history}
    </>
  );
}

/** One triage answer: urgent help first for an emergency, then the doctor list (on the named specialty when there is one). */
function TriageAnswer({ level, specialty, again }: { level: CareLevel; specialty: string | null; again?: () => void }) {
  const t = useTranslations("AssistantWeb");
  const emergency = useTranslations("Emergency");
  const locale = useLocale();
  const urgent = level === "emergency";
  const doctors = specialty ? `/${locale}/consultations/doctors?specialty=${encodeURIComponent(specialty)}` : `/${locale}/consultations/doctors`;
  return (
    <AnswerCard
      icon={urgent ? "warning" : CONSULT.icon}
      tone={urgent ? SERVICE_ICONS.emergency.tone : CONSULT.tone}
      title={urgent ? t("emergencyTitle") : t("consultationTitle")}
      disclaimer={t("disclaimer")}
      urgent={urgent}
      actions={
        <>
          {urgent ? <ButtonLink href={`/${locale}/emergency`} label={emergency("title")} variant="primary" /> : null}
          <ButtonLink href={doctors} label={t("bookConsultation")} variant={urgent ? "outline" : "primary"} />
          {again ? <Button label={t("askAgain")} variant="ghost" onClick={again} /> : null}
        </>
      }
    >
      <p className={styles.answerBody}>{urgent ? t("emergencyBody") : t("consultationBody")}</p>
    </AnswerCard>
  );
}
