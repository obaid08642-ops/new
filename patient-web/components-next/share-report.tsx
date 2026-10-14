"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice } from "@/components-next/consult/consult-parts";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

export type MedicalReportSummary = {
  id: string;
  title?: string | null;
  report_type?: string | null;
  created_at?: string | null;
  provider_name?: string | null;
  status?: string | null;
};

export function ShareReportPanel({ reports, locale, origin }: {
  reports: MedicalReportSummary[];
  locale: string;
  origin: string;
}) {
  const t = useTranslations("ShareReport");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildBundle() {
    const chosen = reports.filter((r) => selected.has(r.id));
    const lines = chosen.map((r) => {
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString(locale) : "";
      return `- ${r.title || r.report_type || r.id}${date ? ` (${date})` : ""} — ${origin}/${locale}/reports/${encodeURIComponent(r.id)}`;
    });
    return `${t("bundleHeader")}\n${lines.join("\n")}`;
  }

  async function share() {
    if (selected.size === 0) return;
    setStatus(t("sharing"));
    const text = buildBundle();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t("bundleTitle"), text });
        setStatus(t("shared"));
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setStatus(t("copied"));
      } else {
        setStatus(t("shareUnavailable"));
      }
    } catch {
      setStatus(t("shareCancelled"));
    }
  }

  if (reports.length === 0) {
    return <ConsultState kind="empty" icon="file-text" title={t("title")} body={t("empty")} />;
  }

  return (
    <section className={styles.stack} aria-label={t("reportsLabel")}>
      <ul className={styles.list}>
        {reports.map((report) => (
          <li key={report.id} className={rx.card}>
            <label className={styles.pickRow}>
              <input type="checkbox" checked={selected.has(report.id)} onChange={() => toggle(report.id)} />
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>{report.title || report.report_type || report.id}</span>
                <span className={styles.rowSub}>
                  {report.provider_name ? `${report.provider_name}${report.created_at ? " · " : ""}` : ""}
                  {report.created_at ? new Date(report.created_at).toLocaleDateString(locale) : ""}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Notice>{t("notice")}</Notice>
      <Button fullWidth label={`${t("share")} (${new Intl.NumberFormat(locale).format(selected.size)})`} disabled={selected.size === 0} onClick={() => void share()} />
      {status ? <p className={styles.ok} role="status">{status}</p> : null}
    </section>
  );
}
