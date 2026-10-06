import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CalendarDays, ChevronLeft, Salad, Stethoscope, Utensils } from "lucide-react";
import { VectorNutrition } from "@/components-next/vector-illustrations";
import { GeneratePlanButton } from "./generate-plan-button";
import styles from "../nutrition.module.css";

type Props = { params: Promise<{ locale: string }> };

type PlanDay = { day?: number | string; meals?: string[] };
type Plan = {
  id: string;
  source: string;
  created_at: string;
  days: PlanDay[];
  notice: string;
  book_nutritionist: { specialty: string };
};

export default async function NutritionPlanPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NutritionPlan");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/nutrition/plan", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const plan: Plan | null = res.ok ? await res.json().catch(() => null) : null;
  const days: PlanDay[] = Array.isArray(plan?.days) ? plan.days : [];

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/nutrition`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Salad size={15} aria-hidden="true" />
            {t("title")}
          </p>
          <h1>{t("title")}</h1>
          <p>
            {locale === "ar"
              ? "خطتك الغذائية الذكية والوجبات المقترحة لتحقيق أهدافك الصحية."
              : "Your smart nutrition plan and meal schedules to reach health goals."}
          </p>
        </div>
        <span className={styles.heroVector}>
          <VectorNutrition size={48} aria-hidden="true" />
        </span>
      </section>

      {days.length === 0 ? (
        <section className={styles.state}>
          <VectorNutrition size={42} aria-hidden="true" />
          <h2>{t("emptyTitle")}</h2>
          <p>{t("emptyHint")}</p>
          <GeneratePlanButton
            labels={{ generate: t("generate"), generating: t("generating"), error: t("error") }}
          />
        </section>
      ) : (
        <>
          <section className={styles.statsGrid}>
            {days.map((item, i) => (
              <article className={styles.statCard} key={String(item?.day ?? i)}>
                <div className={styles.statTop}>
                  <span>
                    {t("day")} {String(item?.day ?? "")}
                  </span>
                  <span className={styles.statGlyph}>
                    <Utensils size={18} aria-hidden="true" />
                  </span>
                </div>
                <p className={styles.statValue} style={{ fontSize: "1.05rem" }}>
                  {Array.isArray(item?.meals) ? item.meals.join(" · ") : ""}
                </p>
                {plan?.created_at ? (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                    <CalendarDays size={13} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 4 }} />
                    {String(plan.created_at).slice(0, 10)}
                  </p>
                ) : null}
              </article>
            ))}
          </section>

          {plan?.notice ? (
            <p className={styles.notice} role="note">
              {plan.notice}
            </p>
          ) : null}

          <div className={styles.actions}>
            <GeneratePlanButton
              labels={{ generate: t("generate"), generating: t("generating"), error: t("error") }}
            />
            <Link
              href={`/${locale}/consultations/doctors?specialty=nutrition`}
              className={styles.nutritionistLink}
            >
              <Stethoscope size={16} aria-hidden="true" />
              {t("nutritionist")}
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
