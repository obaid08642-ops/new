import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Notice } from "@/components-next/consult/consult-parts";
import { NutritionLogMealForm } from "@/components-next/nutrition-log-meal-form";

type Props = { params: Promise<{ locale: string }> };

/** Log a meal (form, stays its own screen): POST /nutrition/meals through the web route. */
export default async function NutritionLogMealPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NutritionWeb");
  await requirePatientAccess(locale);
  return (
    <ConsultPage locale={locale} title={t("logMeal")} backHref={`/${locale}/nutrition`}>
      <NutritionLogMealForm locale={locale} />
      <Notice>{t("mealNotice")}</Notice>
    </ConsultPage>
  );
}
