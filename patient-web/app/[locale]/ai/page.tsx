import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorAI } from "@/components-next/vector-illustrations";
import { TriageForm } from "./triage-form";
import styles from "./triage.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function AiTriagePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("AiTriage");

  const ar = locale === "ar";
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "flex", alignItems: "center", gap: 8 }}>
            {locale === "ar" ? "الفرز الطبي الذكي" : "Smart Medical Triage"}
          </p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>{t("title")}</h1>
          <p className={styles.subtitle} style={{ color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
          <VectorAI size={48} aria-hidden="true" />
        </span>
      </section>

      <section style={{ display: "grid", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
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
      </section>
      <nav aria-label={ar ? "أدوات الذكاء الاصطناعي" : "AI tools"} style={{ display: "flex", gap: 8, flexWrap: "wrap" as any }}>
        <Link href={`/${locale}/ai/skin-analysis`} style={{ color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" as any }}>{locale === "ar" ? "تحليل البشرة" : "Skin analysis"}</Link>
        <Link href={`/${locale}/ai/prescription-translator`} style={{ color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" as any }}>{locale === "ar" ? "مترجم الوصفات" : "Prescription translator"}</Link>
        <Link href={`/${locale}/ai/report`} style={{ color: "#1E332E", border: "1px solid #5FD9B3", borderRadius: 20, padding: "8px 16px", background: "#5FD9B3", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" as any }}>{locale === "ar" ? "تقريري" : "My report"}</Link>
      </nav>
    </main>
  );
}
