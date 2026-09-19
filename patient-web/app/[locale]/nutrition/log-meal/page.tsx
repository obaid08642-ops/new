import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Salad } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorNutrition } from "@/components-next/vector-illustrations";
import { NutritionLogMealForm } from "@/components-next/nutrition-log-meal-form";
import styles from "../nutrition.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function NutritionLogMealPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Nutrition");
  await requirePatientAccess(locale);
  const ar = locale === "ar";
  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/nutrition`} className={styles.back} style={{ color: "#1E332E" }}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("title")}
      </Link>

      <section className={styles.hero} style={{ background: "#FDFDFC", borderColor: "#E8EDEE", borderRadius: 20 }}>
        <div>
          <p className={styles.eyebrow} style={{ color: "#1E332E" }}>
            <Salad size={15} aria-hidden="true" />
            {ar ? "التغذية العلاجية" : "Clinical Nutrition"}
          </p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {ar ? "تسجيل وجبة" : "Log a meal"}
          </h1>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {ar ? "سجّل تفاصيل وجبتك وسيتم تحديث ملخصك اليومي عبر الخادم مباشرة." : "Log your meal — daily summary updates live via callPatientApi."}
          </p>
        </div>
        <span className={styles.heroVector} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(16px)", border: "1px solid #E8EDEE" }}>
          <VectorNutrition size={48} aria-hidden="true" />
        </span>
      </section>

      <section className={styles.mealsSection} style={{ gap: 16 }}>
        <div
          style={{
            padding: 16,
            border: "1px solid #E8EDEE",
            borderRadius: 20,
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 24px rgba(30,51,46,0.07)",
          }}
        >
          <NutritionLogMealForm locale={locale} />
        </div>
        <p
          style={{
            margin: 0,
            padding: 12,
            border: "1px solid #E8EDEE",
            borderInlineStart: "3px solid #5FD9B3",
            borderRadius: 20,
            background: "rgba(240,253,249,0.6)",
            color: "#1E332E",
            fontSize: "0.88rem",
            lineHeight: 1.6,
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {ar ? "لا تُستخدم بيانات وهمية — الحفظ عبر /api/nutrition/meals → callPatientApi فقط." : "No mock — saves via /api/nutrition/meals → callPatientApi only."}
        </p>
      </section>
    </main>
  );
}
