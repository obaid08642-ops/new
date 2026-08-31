import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** تحليل التقارير بالذكاء — تحويل إلى الشاشة الموحدة /ai/report (نفس عقد /api/ai/analyze-report المؤكد، لا تكرار). */
export default async function AiAnalysisPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  redirect(`/${locale}/ai/report`);
}
