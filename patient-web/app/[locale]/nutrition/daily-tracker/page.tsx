import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
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
  const data = res.ok ? await res.json().catch(() => null) : null;
  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/nutrition`} className={styles.back}>{t("title")}</Link>
      <h1>{locale === "ar" ? "المتتبع اليومي" : "Daily tracker"}</h1>
      {data ? <pre dir="ltr" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre> : <p role="alert">{t("error")}</p>}
      <Link href={`/${locale}/nutrition/log-meal`}>{locale === "ar" ? "تسجيل وجبة جديدة" : "Log a new meal"}</Link>
    </main>
  );
}
