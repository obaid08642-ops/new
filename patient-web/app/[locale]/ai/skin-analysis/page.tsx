import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorAI } from "@/components-next/vector-illustrations";
import { SkinAnalysisForm } from "@/components-next/skin-analysis-form";
import styles from "../triage.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SkinAnalysisPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section
        className={styles.hero}
        style={{
          background: "rgba(255,255,255,0.76)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "#E8EDEE",
          borderRadius: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}>
            <Sparkles size={14} aria-hidden="true" />
            {ar ? "تحليل البشرة الذكي" : "Smart Skin Analysis"}
          </p>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {ar ? "تحليل البشرة" : "Skin analysis"}
          </h1>
          <p className={styles.subtitle} style={{ color: "#6B7C6E", overflowWrap: "anywhere" }}>
            {ar ? "نتيجة استرشادية لا تغني عن تشخيص الطبيب." : "Advisory result; not a diagnosis."}
          </p>
        </div>
        <span className={styles.heroIcon} style={{ borderColor: "#E8EDEE", borderRadius: 20 }}>
          <VectorAI size={48} aria-hidden="true" />
        </span>
      </section>
      <div
        className={styles.card}
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "#E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,0.76)",
        }}
      >
        <SkinAnalysisForm locale={locale} />
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
            background: "#FFFFFF",
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
          href={`/${locale}/ai/prescription-translator`}
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
          {ar ? "مترجم الوصفات" : "Prescription translator"}
        </Link>
        <Link
          href={`/${locale}/ai`}
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
          {ar ? "← العودة للمساعد الذكي" : "← Back to AI"}
        </Link>
      </nav>
    </main>
  );
}
