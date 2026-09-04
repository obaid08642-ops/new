import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Droplets, Flame, Salad, Sparkles, Target, Utensils } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorNutrition } from "@/components-next/vector-illustrations";
import styles from "./nutrition.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function NutritionPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Nutrition");
  const today = new Date().toISOString().slice(0, 10);
  const [summaryRes, mealsRes] = await Promise.all([
    callPatientApi(`/nutrition/daily-summary?date=${today}`, {}, token),
    callPatientApi(`/nutrition/meals?date=${today}`, {}, token),
  ]);
  if (summaryRes.status === 401 || mealsRes.status === 401) redirect(`/${locale}/login`);
  const summaryRaw = summaryRes.ok ? await summaryRes.json().catch(() => null) : null;
  const summary = summaryRaw && typeof summaryRaw === "object" && !Array.isArray(summaryRaw)
    ? (typeof (summaryRaw as Record<string, unknown>).data === "object" ? (summaryRaw as Record<string, unknown>).data : summaryRaw) as Record<string, unknown>
    : null;
  const calories = Number(summary?.calories ?? summary?.total_calories ?? NaN);
  const target = Number(summary?.target_calories ?? summary?.calorie_target ?? NaN);
  const water = Number(summary?.water_ml ?? summary?.water ?? NaN);
  const mealsRaw = mealsRes.ok ? await mealsRes.json().catch(() => null) : null;
  const mealsRoot = mealsRaw && typeof mealsRaw === "object" && !Array.isArray(mealsRaw) ? (mealsRaw as Record<string, unknown>) : null;
  const mealsList = (Array.isArray(mealsRaw) ? mealsRaw : [mealsRoot?.data, mealsRoot?.meals, mealsRoot?.items].find(Array.isArray)) ?? [];
  const meals = mealsList.flatMap((value: unknown) => {
    const r = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
    if (!r) return [];
    const name = String(r.name ?? r.title ?? r.meal_type ?? "");
    if (!name) return [];
    return [
      {
        id: String(r.id ?? name),
        name,
        calories: Number(r.calories ?? NaN) || undefined,
        type: typeof r.meal_type === "string" ? r.meal_type : undefined,
      },
    ];
  });

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/dashboard`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {locale === "ar" ? "لوحة التحكم" : "Dashboard"}
      </Link>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Sparkles size={15} aria-hidden="true" />
            {locale === "ar" ? "التغذية العلاجية واللياقة" : "Clinical Nutrition & Wellness"}
          </p>
          <h1>{t("title")}</h1>
          <p className={styles.dateTitle}>
            {new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date())}
          </p>
        </div>
        <span className={styles.heroVector}>
          <VectorNutrition size={48} aria-hidden="true" />
        </span>
      </section>

      {!summaryRes.ok ? (
        <section className={styles.state} role="alert">
          <VectorNutrition size={42} aria-hidden="true" />
          <p>{t("error")}</p>
        </section>
      ) : (
        <section className={styles.statsGrid} aria-label={t("title")}>
          <article className={styles.statCard}>
            <div className={styles.statTop}>
              <span>{t("calories")}</span>
              <span className={styles.statGlyph}>
                <Flame size={18} aria-hidden="true" />
              </span>
            </div>
            <p className={styles.statValue}>
              {Number.isFinite(calories) ? calories.toLocaleString(locale) : "0"}
              <span style={{ fontSize: "0.82rem", fontWeight: 600, marginInlineStart: 4 }}>{t("kcal")}</span>
            </p>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statTop}>
              <span>{t("target")}</span>
              <span className={styles.statGlyph}>
                <Target size={18} aria-hidden="true" />
              </span>
            </div>
            <p className={styles.statValue}>
              {Number.isFinite(target) ? target.toLocaleString(locale) : "—"}
              <span style={{ fontSize: "0.82rem", fontWeight: 600, marginInlineStart: 4 }}>{t("kcal")}</span>
            </p>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statTop}>
              <span>{t("water")}</span>
              <span className={styles.statGlyph}>
                <Droplets size={18} aria-hidden="true" />
              </span>
            </div>
            <p className={styles.statValue}>
              {Number.isFinite(water) ? water.toLocaleString(locale) : "0"}
              <span style={{ fontSize: "0.82rem", fontWeight: 600, marginInlineStart: 4 }}>{t("ml")}</span>
            </p>
          </article>
        </section>
      )}

      <section className={styles.mealsSection}>
        <div className={styles.sectionHeader}>
          <h2>{t("meals")}</h2>
          <Link href={`/${locale}/nutrition/plan`} className={styles.quickBtn}>
            <Salad size={17} aria-hidden="true" />
            {locale === "ar" ? "خطة الوجبات الصحية" : "Diet Plan"}
          </Link>
        </div>

        {meals.length === 0 ? (
          <div className={styles.state}>
            <VectorNutrition size={40} aria-hidden="true" />
            <p>{t("noMeals")}</p>
          </div>
        ) : (
          <ul className={styles.mealsList}>
            {meals.map((meal) => (
              <li key={meal.id} className={styles.mealCard}>
                <div className={styles.mealInfo}>
                  <span className={styles.mealIcon}>
                    <Utensils size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <span className={styles.mealName}>{meal.name}</span>
                    {meal.type ? (
                      <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)" }}>
                        {meal.type}
                      </span>
                    ) : null}
                  </div>
                </div>
                {meal.calories !== undefined ? (
                  <span className={styles.calBadge}>
                    <Flame size={13} aria-hidden="true" />
                    {meal.calories.toLocaleString(locale)} {t("kcal")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
