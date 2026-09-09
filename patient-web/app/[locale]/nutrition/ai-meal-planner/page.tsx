import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app nutrition/ai-meal-planner: unpersisted plans not shown, use the verified daily tracker. */
export default async function NutritionAiMealPlannerPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/nutrition/daily-tracker`);
}
