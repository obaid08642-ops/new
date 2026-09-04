import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
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

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Sparkles size={14} aria-hidden="true" />
            {locale === "ar" ? "الفرز الطبي الذكي" : "Smart Medical Triage"}
          </p>
          <h1>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon}>
          <VectorAI size={52} aria-hidden="true" />
        </span>
      </section>

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
    </main>
  );
}
