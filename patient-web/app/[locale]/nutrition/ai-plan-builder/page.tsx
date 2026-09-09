import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app nutrition/ai-plan-builder: legacy route, use the nutrition hub. */
export default async function NutritionAiPlanBuilderPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/nutrition`);
}
