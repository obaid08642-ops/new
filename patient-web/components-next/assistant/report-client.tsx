"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Notice } from "@/components-next/consult/consult-parts";
import { AnswerCard } from "./assistant-kit";
import styles from "./assistant.module.css";

/**
 * Mode 3, "explain my report". The backend does not interpret medical reports automatically (a report is explained by a
 * doctor), so this mode sends no request: it says so and opens the patient's reports, or shares one with a doctor.
 * Same as the app's report mode (issues 874 and 886).
 */
export function ReportClient() {
  const ai = useTranslations("AiHealthReport");
  const locale = useLocale();
  return (
    <AnswerCard
      icon="file-text"
      tone="violet"
      title={ai("unavailableTitle")}
      disclaimer={ai("disclaimer")}
      actions={
        <div className={styles.thread}>
          <Link href={`/${locale}/health/records?tab=reports`} className="nabd-button nabd-button--primary nabd-button--lg nabd-button--full">
            <span className="nabd-button__label">{ai("openReports")}</span>
          </Link>
          <Link href={`/${locale}/consultations/share-report`} className="nabd-button nabd-button--outline nabd-button--lg nabd-button--full">
            <span className="nabd-button__label">{ai("shareReport")}</span>
          </Link>
        </div>
      }
    >
      <Notice>{ai("unavailableBody")}</Notice>
    </AnswerCard>
  );
}
