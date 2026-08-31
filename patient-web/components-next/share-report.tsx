"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
    return `Nabd Plus — Medical reports shared:\n${lines.join("\n")}`;
  }

  async function share() {
    if (selected.size === 0) return;
    setStatus(t("sharing"));
    const text = buildBundle();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Nabd Plus", text });
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
    return <p className="reports-empty">{t("empty")}</p>;
  }

  return (
    <section className="reports-share" aria-label={t("reportsLabel")}>
      <ul className="reports-list">
        {reports.map((report) => (
          <li key={report.id} className="reports-item">
            <label className="reports-row">
              <input
                type="checkbox"
                checked={selected.has(report.id)}
                onChange={() => toggle(report.id)}
              />
              <span className="reports-title">{report.title || report.report_type || report.id}</span>
              <span className="reports-meta">
                {report.provider_name ? `${report.provider_name} · ` : ""}
                {report.created_at ? new Date(report.created_at).toLocaleDateString(locale) : ""}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="reports-notice">{t("notice")}</p>
      <button type="button" className="reports-share-btn" disabled={selected.size === 0} onClick={() => void share()}>
        {t("share")} ({selected.size})
      </button>
      {status ? <p className="reports-status" role="status">{status}</p> : null}
    </section>
  );
}
