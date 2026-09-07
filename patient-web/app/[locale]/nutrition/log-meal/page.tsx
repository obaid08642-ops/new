import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Salad } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { NutritionLogMealForm } from "@/components-next/nutrition-log-meal-form";
import styles from "../nutrition.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function NutritionLogMealPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Nutrition");
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/nutrition`} className={styles.back}>{t("title")}</Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><Salad size={15} aria-hidden="true" />{t("title")}</p>
          <h1>{locale === "ar" ? "تسجيل وجبة" : "Log a meal"}</h1>
        </div>
      </section>
      <NutritionLogMealForm locale={locale} />
    </main>
  );
}
