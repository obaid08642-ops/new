import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { signInHref } from "@/lib/services/guest";
import { GuestSpecialtyPage } from "@/components-next/guest/guest-specialty-page";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { pickTab } from "@/lib/health/view";
import { parseMeals, parseNutritionSummary } from "@/lib/nutrition/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { CareHero, RecordRow } from "@/components-next/care/care-kit";
import { HealthTabs, RowsCard, SectionHead, VitalTile } from "@/components-next/health/health-kit";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { NutritionBodyTargetClient } from "@/components-next/nutrition-body-target-client";
import { NutritionPlanGenerate } from "@/components-next/nutrition-plan-generate";
import { QuickLogForm } from "@/components-next/health/quick-log-form";
import { Notice } from "@/components-next/consult/consult-parts";
import { parseNutritionPlan } from "@/lib/nutrition/plan";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[] }> };

const TABS = ["today", "plan", "target"] as const;
const NUTRITION = SERVICE_ICONS.nutrition;
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

/**
 * Nutrition (canvas/CareHub; merge map 2, section 8): tabs `?tab=today|plan|target`. Plan is the AI nutrition plan (owner decision
 * 2026-10-05): GET /nutrition/plan (204 when none), "generate my plan" (POST /nutrition/plan/generate from the profile) and "follow
 * up with a nutritionist" (the doctor list on the nutrition specialty). Today is the day's summary
 * (GET /nutrition/daily-summary: calories against the target, water) and the meals of the day (GET /nutrition/meals), with "Log a meal"
 * (the form stays its own screen). Target is the body-target form (GET and POST /nutrition/profile), absorbing the old body-target page.
 */
export default async function NutritionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NutritionWeb");
  const rs = await getTranslations("RouteState");
  const token = await getOptionalPatientAccessToken();
  const tab = pickTab(query.tab, TABS, "today");
  const base = `/${locale}/nutrition`;
  if (!token) {
    // Issue 1550: a guest sees what the service is and its nutritionists; the plan, the meals and the target need a session.
    const g = await getTranslations("GuestServices");
    return (
      <GuestSpecialtyPage
        locale={locale}
        title={t("title")}
        tone={NUTRITION.tone}
        icon={NUTRITION.icon}
        heroTitle={g("nutrition.heroTitle")}
        heroBody={g("nutrition.heroBody")}
        specialty="nutrition"
        doctorsTitle={g("nutrition.doctorsTitle")}
        action={{ id: "nutrition-sign-in", title: g("nutrition.actionTitle"), body: g("nutrition.actionBody"), label: g("nutrition.action"), next: `${base}?tab=plan` }}
      />
    );
  }

  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/dashboard`}>
      <HealthTabs label={t("tabsLabel")} base={base} active={tab} options={[
        { value: "today", label: t("tabToday") },
        { value: "plan", label: t("tabPlan") },
        { value: "target", label: t("tabTarget") },
      ]} />
      {body}
    </ConsultPage>
  );

  if (tab === "target") return frame(<NutritionBodyTargetClient locale={locale} />);

  if (tab === "plan") {
    let planRes: Response;
    try {
      planRes = await callPatientApi("/nutrition/plan", {}, token);
    } catch {
      return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
    }
    if (planRes.status === 401) redirect(signInHref(locale, `${base}?tab=${tab}`));
    if (!planRes.ok && planRes.status !== 204) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
    const plan = planRes.status === 204 ? null : parseNutritionPlan(await planRes.json().catch(() => null));
    const nutritionist = <ButtonLink href={`/${locale}/consultations/doctors?specialty=nutrition`} label={t("planNutritionist")} variant="outline" />;
    if (!plan) {
      return frame(
        <>
          <ConsultState kind="empty" icon={NUTRITION.icon} tone={NUTRITION.tone} title={t("planEmptyTitle")} body={t("planEmptyBody")} />
          <NutritionPlanGenerate />
          {nutritionist}
        </>,
      );
    }
    const number = new Intl.NumberFormat(locale);
    return frame(
      <>
        <Notice>{t("planNotice")}</Notice>
        {plan.days.map((day) => (
          <section key={day.day} aria-labelledby={`plan-day-${day.day}`}>
            <SectionHead id={`plan-day-${day.day}`} title={t("planDay", { n: number.format(day.day) })} />
            <RowsCard label={t("planDay", { n: number.format(day.day) })}>
              {day.meals.map((meal, index) => (
                <li key={index}><RecordRow icon="bowl-food" tone={NUTRITION.tone} title={meal} sub={[]} /></li>
              ))}
            </RowsCard>
          </section>
        ))}
        {nutritionist}
        <NutritionPlanGenerate again />
      </>,
    );
  }

  // The patient's day in Saudi time, not UTC (needs-review issue 868): en-CA formats as YYYY-MM-DD.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
  let summaryRes: Response;
  let mealsRes: Response;
  try {
    [summaryRes, mealsRes] = await Promise.all([
      callPatientApi(`/nutrition/daily-summary?date=${today}`, {}, token),
      callPatientApi(`/nutrition/meals?date=${today}`, {}, token),
    ]);
  } catch {
    return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
  }
  if (summaryRes.status === 401 || mealsRes.status === 401) redirect(signInHref(locale, `${base}?tab=${tab}`));
  if (!summaryRes.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  const summary = parseNutritionSummary(await summaryRes.json().catch(() => null));
  const meals = mealsRes.ok ? parseMeals(await mealsRes.json().catch(() => null)) : null;
  const number = new Intl.NumberFormat(locale);
  const kcal = (value: number) => t("kcalValue", { value: number.format(value) });
  const ratio = summary.target && summary.target > 0 ? Math.min(summary.calories / summary.target, 1) : 0;

  return frame(
    <>
      <div className={styles.toolbar}>
        <span />
        <ButtonLink href={`${base}/log-meal`} label={t("logMeal")} size="md" />
      </div>
      <CareHero
        tone={NUTRITION.tone}
        icon={NUTRITION.icon}
        label={t("todayTitle")}
        ring={{ value: ratio, label: t("ringLabel", { calories: number.format(summary.calories), target: summary.target === null ? "-" : number.format(summary.target) }), valueText: number.format(summary.calories), caption: t("kcal") }}
        title={t("todayTitle")}
        lines={[
          new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date()),
          summary.target !== null ? t("targetLine", { value: kcal(summary.target) }) : t("noTarget"),
        ]}
      />
      <ul className={styles.tiles} aria-label={t("todayTitle")}>
        <li><VitalTile label={t("calories")} value={number.format(summary.calories)} unit={t("kcal")} icon="bowl-food" tone={NUTRITION.tone} /></li>
        <li><VitalTile label={t("water")} value={number.format(summary.waterMl)} unit={t("ml")} icon="drop" tone="blue" /></li>
      </ul>
      <SectionHead id="log-water" title={t("water")} />
      <QuickLogForm kind="water" />
      <SectionHead id="meals" title={t("meals")} />
      {meals === null ? (
        <ConsultState kind="error" title={t("mealsUnavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      ) : meals.length === 0 ? (
        <ConsultState kind="empty" icon={NUTRITION.icon} tone={NUTRITION.tone} title={t("meals")} body={t("noMeals")} actionLabel={t("logMeal")} actionHref={`${base}/log-meal`} />
      ) : (
        <RowsCard label={t("meals")}>
          {meals.map((meal) => (
            <li key={meal.id}>
              <RecordRow
                icon="bowl-food"
                tone={NUTRITION.tone}
                title={meal.name}
                sub={meal.type && MEAL_TYPES.includes(meal.type) ? [t(`mealType.${meal.type}`)] : []}
                end={meal.calories !== undefined ? <bdi>{kcal(meal.calories)}</bdi> : undefined}
              />
            </li>
          ))}
        </RowsCard>
      )}
    </>,
  );
}
