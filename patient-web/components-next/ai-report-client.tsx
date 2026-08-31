"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Report = { id: string; title?: string | null; report_type?: string | null; created_at?: string | null };

export function AiReportClient({ reports, locale }: { reports: Report[]; locale: string }) {
  const t = useTranslations("AiHealthReport");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function analyze() {
    if (selected.size === 0) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/ai/analyze-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report_ids: [...selected], locale }),
      });
      if (!res.ok) throw new Error("analyze_failed");
      const data = await res.json();
      setResult(data.summary ?? data.result ?? null);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      {reports.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {reports.map((r) => (
            <li key={r.id}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                <span>{r.title ?? r.report_type ?? r.id}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={analyze} disabled={loading || selected.size === 0}>
        {loading ? t("analyzing") : t("analyze")}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {result ? (
        <div>
          <h2>{t("resultTitle")}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{result}</p>
          <p style={{ opacity: 0.7 }}>{t("disclaimer")}</p>
        </div>
      ) : null}
    </section>
  );
}
