"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { CONSULT, Notice } from "@/components-next/consult/consult-parts";
import forms from "@/components-next/consult/consult.module.css";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { MIN_SYMPTOMS_LENGTH, assistantRequestBody, parseAssistantAnswer, type AssistantAnswer } from "@/lib/ai/assistant";
import { AnswerCard, AskedBubble } from "./assistant-kit";
import styles from "./assistant.module.css";

type Phase = { kind: "idle" } | { kind: "loading" } | { kind: "failed" } | { kind: "answered"; asked: string; answer: AssistantAnswer };

const EXAMPLES = ["example1", "example2", "example3", "example4"] as const;

/**
 * Mode 1, "ask the assistant" (decisions 7 and 15): POST /ai/assistant with the question and the page's language. The server
 * answers in that language and decides the kind: a red flag shows the urgent-help page first; a symptom names the specialty and
 * the doctor list opens on it; a medicine of our catalogue shows its leaflet and "ask the pharmacist"; anything else says what
 * the assistant can do. Every answer carries the server's disclaimer. No diagnosis, no medicine to take, no dose.
 */
export function SymptomsClient() {
  const t = useTranslations("AssistantWeb");
  const locale = useLocale();
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const loading = phase.kind === "loading";
  const ready = question.trim().length >= MIN_SYMPTOMS_LENGTH && !loading;

  async function submit() {
    if (!ready) return;
    const asked = question.trim();
    setPhase({ kind: "loading" });
    try {
      const response = await fetch("/api/patient/ai/assistant", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        body: JSON.stringify(assistantRequestBody(asked, locale)),
      });
      if (!response.ok) throw new Error("assistant_unavailable");
      const answer = parseAssistantAnswer(await response.json().catch(() => null));
      if (!answer) throw new Error("assistant_empty");
      setPhase({ kind: "answered", asked, answer });
    } catch {
      setPhase({ kind: "failed" });
    }
  }

  function again() {
    setQuestion("");
    setPhase({ kind: "idle" });
  }

  if (phase.kind === "answered") {
    return (
      <div className={styles.thread}>
        <AskedBubble text={phase.asked} label={t("askedLabel")} />
        <Answer answer={phase.answer} again={again} />
      </div>
    );
  }

  return (
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
            <button key={key} type="button" className={forms.choice} onClick={() => setQuestion((current) => (current ? `${current}, ${t(key)}` : t(key)))}>
              {t(key)}
            </button>
          ))}
        </div>
      </div>
      <label className={forms.field}>
        <span className={forms.label}>{t("symptomsLabel")}</span>
        <textarea className={forms.control} rows={5} value={question} maxLength={1000} placeholder={t("symptomsPlaceholder")} onChange={(event) => setQuestion(event.target.value)} dir="auto" />
      </label>
      {phase.kind === "failed" ? <div role="alert"><Notice warn>{t("error")}</Notice></div> : null}
      <Button type="submit" label={loading ? t("submitting") : t("submit")} fullWidth size="lg" disabled={!ready} loading={loading} startIcon="sparkle" />
    </form>
  );
}

/** One answer: urgent help first for a red flag; the doctor list on the named specialty; the leaflet and "ask the pharmacist". */
function Answer({ answer, again }: { answer: AssistantAnswer; again: () => void }) {
  const t = useTranslations("AssistantWeb");
  const emergency = useTranslations("Emergency");
  const locale = useLocale();
  const doctors = answer.specialty ? `/${locale}/consultations/doctors?specialty=${encodeURIComponent(answer.specialty)}` : `/${locale}/consultations/doctors`;
  const title = answer.urgent ? t("emergencyTitle") : answer.kind === "leaflet" ? t("leafletTitle") : answer.kind === "out_of_scope" ? t("outOfScopeTitle") : t("consultationTitle");
  return (
    <AnswerCard
      icon={answer.urgent ? "warning" : answer.kind === "leaflet" ? "pill" : CONSULT.icon}
      tone={answer.urgent ? SERVICE_ICONS.emergency.tone : answer.kind === "leaflet" ? SERVICE_ICONS.pharmacy.tone : CONSULT.tone}
      title={title}
      disclaimer={answer.disclaimer}
      urgent={answer.urgent}
      actions={
        <>
          {answer.urgent ? <ButtonLink href={`/${locale}/emergency`} label={emergency("title")} variant="primary" /> : null}
          {answer.askPharmacist ? <ButtonLink href={`/${locale}/pharmacy/chat`} label={t("askPharmacist")} variant="primary" /> : null}
          {answer.bookable ? <ButtonLink href={doctors} label={t("bookConsultation")} variant={answer.urgent || answer.askPharmacist ? "outline" : "primary"} /> : null}
          <Button label={t("askAgain")} variant="ghost" onClick={again} />
        </>
      }
    >
      <p className={styles.answerBody} dir="auto">{answer.text}</p>
      {answer.leaflet.map((section) => (
        <div key={section.part}>
          <h3 className={forms.label}>{t(`leaflet.${section.part}`)}</h3>
          <ul className={styles.answerBody} dir="auto">{section.lines.map((line, i) => <li key={i}>{line}</li>)}</ul>
        </div>
      ))}
    </AnswerCard>
  );
}
