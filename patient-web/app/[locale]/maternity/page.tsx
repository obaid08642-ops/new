import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Baby, CalendarDays, ChevronLeft, Heart, Sparkles, Stethoscope, Activity } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorMaternity } from "@/components-next/vector-illustrations";
import styles from "./maternity.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function MaternityPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Maternity");
  const response = await callPatientApi("/maternity/profile", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const raw = response.ok ? await response.json().catch(() => null) : null;
  const root = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const profile = root && typeof root.data === "object" && root.data !== null ? (root.data as Record<string, unknown>) : root;
  const hasProfile = !!profile && Object.keys(profile).length > 0;
  const week = Number(profile?.pregnancy_week ?? profile?.current_week ?? profile?.week ?? NaN);
  const dueDate =
    typeof profile?.due_date === "string"
      ? profile.due_date
      : typeof profile?.expected_delivery_date === "string"
        ? profile.expected_delivery_date
        : null;
  const mode = typeof profile?.mode === "string" ? profile.mode : null;

  const validWeek = Number.isFinite(week) && week > 0 ? Math.min(week, 42) : null;
  const progressPercent = validWeek ? Math.min(Math.round((validWeek / 40) * 100), 100) : 0;
  const trimester = validWeek
    ? validWeek <= 13
      ? locale === "ar" ? "الثلث الأول" : "1st Trimester"
      : validWeek <= 27
        ? locale === "ar" ? "الثلث الثاني" : "2nd Trimester"
        : locale === "ar" ? "الثلث الثالث" : "3rd Trimester"
    : null;

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/dashboard`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {locale === "ar" ? "لوحة التحكم" : "Dashboard"}
      </Link>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Heart size={15} aria-hidden="true" />
            {locale === "ar" ? "رعاية الأم والجنين" : "Maternal & Fetal Care"}
          </p>
          <h1>{t("title")}</h1>
          <p>
            {locale === "ar"
              ? "متابعة دقيقة لكل مراحل الحمل وتطور الجنين مع توجيهات طبية مخصصة وفحوصات دورية معتمدة."
              : "Comprehensive tracking of pregnancy stages and fetal milestones with clinical guidance."}
          </p>
        </div>
        <span className={styles.heroVector}>
          <VectorMaternity size={48} aria-hidden="true" />
        </span>
      </section>

      {!response.ok ? (
        <section className={styles.state} role="alert">
          <VectorMaternity size={42} aria-hidden="true" />
          <p>{t("error")}</p>
        </section>
      ) : !hasProfile ? (
        <section className={styles.state}>
          <VectorMaternity size={48} aria-hidden="true" />
          <p>{t("empty")}</p>
          <div className={styles.quickNav} style={{ marginTop: "1rem" }}>
            <Link href={`/${locale}/consultations/doctors`} className={styles.quickBtn}>
              <Stethoscope size={18} aria-hidden="true" />
              {locale === "ar" ? "استشارة طبيبة نساء وولادة" : "Consult Obstetrician"}
            </Link>
          </div>
        </section>
      ) : (
        <>
          {validWeek ? (
            <article className={styles.progressCard}>
              <div className={styles.progressTop}>
                <div className={styles.weekHighlight}>
                  <span className={styles.weekNum}>{validWeek}</span>
                  <span className={styles.weekLabel}>{t("week")}</span>
                </div>
                {trimester ? (
                  <span className={styles.trimesterBadge}>
                    <Sparkles size={14} aria-hidden="true" />
                    {trimester}
                  </span>
                ) : null}
              </div>

              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ inlineSize: `${progressPercent}%` }} />
              </div>

              <div className={styles.progressMeta}>
                <span>{progressPercent}% {locale === "ar" ? "من رحلة الحمل" : "of journey"}</span>
                <span>40 {locale === "ar" ? "أسبوعاً" : "weeks"}</span>
              </div>
            </article>
          ) : null}

          <section className={styles.metricsGrid} aria-label={t("title")}>
            {dueDate ? (
              <article className={styles.metricCard}>
                <div className={styles.metricTop}>
                  <span>{t("dueDate")}</span>
                  <span className={styles.metricGlyph}>
                    <CalendarDays size={18} aria-hidden="true" />
                  </span>
                </div>
                <p className={styles.metricValue}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(dueDate))}
                </p>
                <p className={styles.metricSub}>
                  {locale === "ar" ? "الموعد المقدر للولادة" : "Estimated delivery date"}
                </p>
              </article>
            ) : null}

            {mode ? (
              <article className={styles.metricCard}>
                <div className={styles.metricTop}>
                  <span>{t("mode")}</span>
                  <span className={styles.metricGlyph}>
                    <Baby size={18} aria-hidden="true" />
                  </span>
                </div>
                <p className={styles.metricValue}>{mode}</p>
                <p className={styles.metricSub}>
                  {locale === "ar" ? "برنامج المتابعة النشط" : "Active tracking mode"}
                </p>
              </article>
            ) : null}

            <article className={styles.metricCard}>
              <div className={styles.metricTop}>
                <span>{locale === "ar" ? "سجل المتابعة" : "Tracker Log"}</span>
                <span className={styles.metricGlyph}>
                  <Activity size={18} aria-hidden="true" />
                </span>
              </div>
              <p className={styles.metricValue}>
                <Link href={`/${locale}/maternity/tracker`} style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 4 }}>
                  {locale === "ar" ? "عرض الأحداث" : "View Events"}
                </Link>
              </p>
              <p className={styles.metricSub}>
                {locale === "ar" ? "حركات الجنين ومؤشرات الفحص" : "Fetal movements & notes"}
              </p>
            </article>
          </section>

          <nav className={styles.quickNav} aria-label={locale === "ar" ? "خدمات الأمومة" : "Maternity Services"}>
            <Link href={`/${locale}/maternity/tracker`} className={styles.quickBtn}>
              <Activity size={18} aria-hidden="true" />
              {locale === "ar" ? "سجل متابعة الأعراض والحركة" : "Movement & Symptom Log"}
            </Link>
            <Link href={`/${locale}/consultations/doctors`} className={styles.quickBtn}>
              <Stethoscope size={18} aria-hidden="true" />
              {locale === "ar" ? "حجز استشارة نساء وتوليد" : "Obstetrician Consultation"}
            </Link>
            <Link href={`/${locale}/diagnostics/radiology`} className={styles.quickBtn}>
              <Sparkles size={18} aria-hidden="true" />
              {locale === "ar" ? "فحص السونار والأشعة" : "Ultrasound & Scans"}
            </Link>
          </nav>

          <p className={styles.notice}>
            {locale === "ar"
              ? "تنبيه طبي: المواعيد وتواريخ الحمل المعروضة هي تقديرات إرشادية تعتمد على بياناتك المسجلة، ولا تغني عن الاستشارة الدورية مع طبيبتك المختصة."
              : "Medical disclaimer: All dates and gestational ages are estimates and do not replace formal clinical ultrasound or doctor evaluation."}
          </p>
        </>
      )}
    </main>
  );
}
