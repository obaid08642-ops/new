import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Droplets, Flame, Salad, Target } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorNutrition } from "@/components-next/vector-illustrations";
import styles from "../nutrition.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function NutritionDailyTrackerPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Nutrition");
  const token = await requirePatientAccess(locale);
  const today = new Date().toISOString().slice(0, 10);
  const res = await callPatientApi(`/nutrition/daily-summary?date=${today}`, {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const raw = res.ok ? await res.json().catch(() => null) : null;
  const root = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const data = root && typeof root.data === "object" && root.data !== null ? (root.data as Record<string, unknown>) : root;
  const calories = Number(data?.calories ?? data?.total_calories ?? NaN);
  const target = Number(data?.target_calories ?? data?.calorie_target ?? NaN);
  const water = Number(data?.water_ml ?? data?.water ?? NaN);

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/nutrition`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("title")}
      </Link>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Salad size={15} aria-hidden="true" />
            {locale === "ar" ? "المتتبع اليومي" : "Daily Tracker"}
          </p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {locale === "ar" ? "المتتبع اليومي" : "Daily tracker"}
          </h1>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {locale === "ar" ? "ملخص استهلاكك اليومي من السعرات والمياه مع مقارنة بالهدف العلاجي." : "Daily calories and hydration versus your clinical target."}
          </p>
          <p className={styles.dateTitle} style={{ marginTop: 8 }}>
            {new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date())}
          </p>
        </div>
        <span className={styles.heroVector}>
          <VectorNutrition size={48} aria-hidden="true" />
        </span>
      </section>

      {!res.ok ? (
        <section className={styles.state} role="alert">
          <VectorNutrition size={42} aria-hidden="true" />
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("error")}</p>
        </section>
      ) : (
        <section className={styles.statsGrid} aria-label={locale === "ar" ? "المتتبع اليومي" : "Daily tracker"}>
          <article className={styles.statCard}>
            <div className={styles.statTop}>
              <span>{t("calories")}</span>
              <span className={styles.statGlyph}><Flame size={18} aria-hidden="true" /></span>
            </div>
            <p className={styles.statValue} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {Number.isFinite(calories) ? calories.toLocaleString(locale) : "0"}
              <span style={{ fontSize: "0.82rem", fontWeight: 600, marginInlineStart: 4 }}>{t("kcal")}</span>
            </p>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statTop}>
              <span>{t("target")}</span>
              <span className={styles.statGlyph}><Target size={18} aria-hidden="true" /></span>
            </div>
            <p className={styles.statValue} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {Number.isFinite(target) ? target.toLocaleString(locale) : "—"}
              <span style={{ fontSize: "0.82rem", fontWeight: 600, marginInlineStart: 4 }}>{t("kcal")}</span>
            </p>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statTop}>
              <span>{t("water")}</span>
              <span className={styles.statGlyph}><Droplets size={18} aria-hidden="true" /></span>
            </div>
            <p className={styles.statValue} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {Number.isFinite(water) ? water.toLocaleString(locale) : "0"}
              <span style={{ fontSize: "0.82rem", fontWeight: 600, marginInlineStart: 4 }}>{t("ml")}</span>
            </p>
          </article>
        </section>
      )}

      <nav className={styles.quickNav} aria-label={locale === "ar" ? "إجراءات" : "Actions"}>
        <Link href={`/${locale}/nutrition/log-meal`} className={styles.quickBtnPrimary} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE" }}>
          {locale === "ar" ? "تسجيل وجبة جديدة" : "Log a new meal"}
        </Link>
        <Link href={`/${locale}/nutrition/plan`} className={styles.quickBtn} style={{ borderColor: "#E8EDEE", borderRadius: 20, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(16px)" }}>
          {locale === "ar" ? "خطة الوجبات" : "Diet plan"}
        </Link>
      </nav>
    </main>
  );
}
