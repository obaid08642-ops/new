import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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
      <section className={styles.hero} style={{ borderColor: "#E8EDEE", borderRadius: 20 }}>
        <div>
          <p className={styles.eyebrow}>{ar ? "الذكاء الاصطناعي" : "AI"}</p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ar ? "تحليل البشرة" : "Skin analysis"}</h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere" }}>{ar ? "نتيجة استرشادية لا تغني عن تشخيص الطبيب." : "Advisory result; not a diagnosis."}</p>
        </div>
        <span className={styles.heroIcon}><VectorAI size={48} aria-hidden="true" /></span>
      </section>
      <div className={styles.card} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <SkinAnalysisForm locale={locale} />
      </div>
      <Link href={`/${locale}/ai`} style={{ display: "inline-flex", marginTop: 16, color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" }}>{ar ? "← العودة للمساعد الذكي" : "← Back to AI"}</Link>
    </main>
  );
}
