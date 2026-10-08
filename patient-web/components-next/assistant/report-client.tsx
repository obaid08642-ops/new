"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Notice } from "@/components-next/consult/consult-parts";
import { formatDate } from "@/lib/format-date";
import { analysisSummary } from "@/lib/ai/assistant";
import { AnswerCard } from "./assistant-kit";
import styles from "./assistant.module.css";

export type AssistantReport = { id: string; title?: string | null; report_type?: string | null; created_at?: string | null };

type Phase = { kind: "idle" } | { kind: "loading" } | { kind: "failed" } | { kind: "answered"; summary: string };

/**
 * Mode 3, "explain my report": the person's medical reports (read by the page from GET /medical-reports/mine) are ticked and
 * POST /api/ai/analyze-report answers with a summary, which is drawn as given with the disclaimer. Unchanged call and fields.
 */
export function ReportClient({ reports }: { reports: AssistantReport[] }) {
  const t = useTranslations("AssistantWeb");
  const ai = useTranslations("AiHealthReport");
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const loading = phase.kind === "loading";

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function analyze() {
    if (selected.length === 0 || loading) return;
    setPhase({ kind: "loading" });
    try {
      // backend binding: proxied via /api/ai/analyze-report -> callPatientApi("/ai/analyze-report", ...)
      const response = await fetch("/api/ai/analyze-report", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report_ids: selected, locale }),
      });
      if (!response.ok) throw new Error("analyze_failed");
      const summary = analysisSummary(await response.json().catch(() => null));
      if (!summary) throw new Error("analyze_empty");
      setPhase({ kind: "answered", summary });
    } catch {
      setPhase({ kind: "failed" });
    }
  }

  if (reports.length === 0) return <Notice>{ai("empty")}</Notice>;

  if (phase.kind === "answered") {
    return (
      <AnswerCard
        icon="file-text"
        tone="violet"
        title={ai("resultTitle")}
        disclaimer={ai("disclaimer")}
        actions={<Button label={t("explainAnother")} variant="ghost" onClick={() => setPhase({ kind: "idle" })} />}
      >
        <p className={styles.answerBody} dir="auto">{phase.summary}</p>
      </AnswerCard>
    );
  }

  return (
    <div className={styles.thread}>
      <p className={styles.pickSub} id="assistant-reports">{ai("selectReports")}</p>
      <ul className={styles.picks} aria-labelledby="assistant-reports">
        {reports.map((report) => {
          const date = formatDate(locale, report.created_at);
          return (
            <li key={report.id}>
              <label className={styles.pick}>
                <input type="checkbox" className={styles.pickBox} checked={selected.includes(report.id)} onChange={() => toggle(report.id)} />
                <span className={styles.pickBody}>
                  <span className={styles.pickTitle} dir="auto">{report.title || report.report_type || t("untitledReport")}</span>
                  {date ? <span className={styles.pickSub}>{date}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {phase.kind === "failed" ? <div role="alert"><Notice warn>{ai("error")}</Notice></div> : null}
      <Button label={loading ? ai("analyzing") : ai("analyze")} fullWidth size="lg" disabled={selected.length === 0 || loading} loading={loading} startIcon="sparkle" onClick={() => void analyze()} />
    </div>
  );
}
