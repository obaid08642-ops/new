import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { NutritionBodyTargetClient } from "@/components-next/nutrition-body-target-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app nutrition/body-target: GET/POST /nutrition/profile with numeric validation. */
export default async function NutritionBodyTargetPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/nutrition`}>{ar ? "التغذية" : "Nutrition"}</Link>
      <h1>{ar ? "أهداف الجسم" : "Body targets"}</h1>
      <p>{ar ? "حدد هدفك ونشاطك وقياساتك لحساب احتياجك اليومي." : "Set your goal, activity and measurements to compute your daily needs."}</p>
      <NutritionBodyTargetClient locale={locale} />
    </main>
  );
}
