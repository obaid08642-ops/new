import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorAI } from "@/components-next/vector-illustrations";
import { type MedicalReportSummary } from "@/lib/api/reports-server";
import { callPatientApi } from "@/lib/api/upstream";
import { AiReportClient } from "@/components-next/ai-report-client";
import styles from "../triage.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function AiHealthReportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("AiHealthReport");
  let reports: MedicalReportSummary[] = [];
  try {
    const response = await callPatientApi("/medical-reports/mine?limit=100", {}, token);
    if (response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const list = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
          ? ((payload as { data: unknown[] }).data)
          : [];
      reports = list.filter(
        (item): item is MedicalReportSummary =>
          !!item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string",
      );
    }
  } catch { reports = []; }
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "flex", alignItems: "center", gap: 8 }}>AI</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("title")}</h1>
          <p className={styles.subtitle} style={{ color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("disclaimer")}</p>
        </div>
        <span className={styles.heroIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
          <VectorAI size={48} aria-hidden="true" />
        </span>
      </section>
      <div className={styles.card} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.82)" }}>
        <AiReportClient reports={reports} locale={locale} />
      </div>
    </main>
  );
}
