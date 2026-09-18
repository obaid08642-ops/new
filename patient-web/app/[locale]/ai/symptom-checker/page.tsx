import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorAI } from "@/components-next/vector-illustrations";
import { TriageForm } from "../triage-form";
import styles from "../triage.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function AiSymptomCheckerPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("AiTriage");
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Sparkles size={14} aria-hidden="true" />
            {ar ? "فاحص الأعراض الذكي" : "Smart Symptom Checker"}
          </p>
          <h1
            style={{
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {ar ? "صف أعراضك — تحليل فوري" : "Describe your symptoms — instant analysis"}
          </h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere" }}>
            {t("subtitle")}
          </p>
        </div>
        <span className={styles.heroIcon}>
          <VectorAI size={48} aria-hidden="true" />
        </span>
      </section>

      <div className={styles.card} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <TriageForm
          locale={locale}
          labels={{
            placeholder: t("placeholder"),
            submit: t("submit"),
            submitting: t("submitting"),
            error: t("error"),
            resultTitle: t("resultTitle"),
            disclaimer: t("disclaimer"),
          }}
        />
      </div>

      <nav
        aria-label={ar ? "أدوات الذكاء الاصطناعي" : "AI tools"}
        style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}
      >
        <Link
          href={`/${locale}/ai/triage`}
          style={{
            display: "inline-flex",
            padding: "10px 16px",
            background: "#5FD9B3",
            color: "#1E332E",
            borderRadius: 20,
            border: "1px solid #E8EDEE",
            fontWeight: 700,
            textDecoration: "none",
            overflowWrap: "anywhere",
          }}
        >
          {ar ? "الفرز الطبي" : "Medical triage"}
        </Link>
        <Link
          href={`/${locale}/ai/report`}
          style={{
            display: "inline-flex",
            padding: "10px 16px",
            background: "#FFFFFF",
            color: "#1E332E",
            borderRadius: 20,
            border: "1px solid #E8EDEE",
            fontWeight: 700,
            textDecoration: "none",
            overflowWrap: "anywhere",
          }}
        >
          {ar ? "تقريري" : "My report"}
        </Link>
        <Link
          href={`/${locale}/ai/monthly-report`}
          style={{
            display: "inline-flex",
            padding: "10px 16px",
            background: "#FFFFFF",
            color: "#1E332E",
            borderRadius: 20,
            border: "1px solid #E8EDEE",
            fontWeight: 700,
            textDecoration: "none",
            overflowWrap: "anywhere",
          }}
        >
          {ar ? "تقريري الشهري" : "Monthly report"}
        </Link>
      </nav>
    </main>
  );
}
