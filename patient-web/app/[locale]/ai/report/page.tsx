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
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.hero} style={{ borderColor: "#E8EDEE", borderRadius: 20 }}>
        <div>
          <p className={styles.eyebrow}>AI</p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("title")}</h1>
          <p className={styles.subtitle} style={{ opacity: 0.85, overflowWrap: "anywhere" }}>{t("disclaimer")}</p>
        </div>
        <span className={styles.heroIcon}><VectorAI size={48} aria-hidden="true" /></span>
      </section>
      <div className={styles.card} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <AiReportClient reports={reports} locale={locale} />
      </div>
    </main>
  );
}
