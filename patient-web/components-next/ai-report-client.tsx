"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Bot, Sparkles } from "lucide-react";
import styles from "@/app/[locale]/ai/triage.module.css";

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
      // backend binding: proxied via /api/ai/analyze-report -> callPatientApi("/ai/analyze-report", ...) — no mock
      const res = await fetch("/api/ai/analyze-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report_ids: [...selected], locale }),
      });
      if (!res.ok) throw new Error("analyze_failed");
      const data = await res.json();
      setResult(data.summary ?? data.result ?? data.data?.summary ?? null);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <p className={styles.promptTitle} style={{ overflowWrap: "anywhere" }}>{t("selectReports")}</p>
      {reports.length === 0 ? (
        <p style={{ color: "#6B7C6E", fontSize: 14, lineHeight: 1.7, overflowWrap: "anywhere", margin: 0 }}>{t("empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {reports.map((r) => {
            const checked = selected.has(r.id);
            const label = r.title ?? r.report_type ?? r.id;
            return (
              <li key={r.id}>
                <label
                  onClick={() => toggle(r.id)}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: 20,
                    border: "1px solid #E8EDEE",
                    background: checked ? "rgba(95,217,179,0.14)" : "#FDFDFC",
                    cursor: "pointer",
                    transition: "border-color .16s ease, background-color .16s ease",
                    overflowWrap: "anywhere",
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} style={{ accentColor: "#1E332E" }} />
                  <span style={{ fontSize: 14, fontWeight: 650, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={analyze}
        disabled={loading || selected.size === 0}
        className={styles.submitBtn}
        style={{ gap: 8 }}
      >
        <Sparkles size={16} aria-hidden="true" />
        {loading ? t("analyzing") : t("analyze")}
      </button>
      {error ? (
        <p role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#92400e", background: "#FFFBEB", border: "1px solid #E8EDEE", borderRadius: 12, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, overflowWrap: "anywhere", margin: 0 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
      {result ? (
        <div className={styles.resultCard} style={{ marginTop: 8 }}>
          <div className={styles.resultHeader}>
            <h2 className={styles.resultTitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              <Bot size={18} color="#1E332E" aria-hidden="true" />
              {t("resultTitle")}
            </h2>
          </div>
          <p className={styles.resultBody}>{result}</p>
          <div className={styles.disclaimer} style={{ overflowWrap: "anywhere" }}>
            <AlertTriangle size={16} color="#b45309" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{t("disclaimer")}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
