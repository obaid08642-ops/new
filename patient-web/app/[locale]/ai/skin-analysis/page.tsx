import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { SkinAnalysisForm } from "@/components-next/skin-analysis-form";

type Props = { params: Promise<{ locale: string }> };

export default async function SkinAnalysisPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/ai`}>{ar ? "الذكاء الاصطناعي" : "AI"}</Link>
      <h1>{ar ? "تحليل البشرة" : "Skin analysis"}</h1>
      <p>{ar ? "نتيجة استرشادية لا تغني عن تشخيص الطبيب." : "Advisory result; not a diagnosis."}</p>
      <SkinAnalysisForm locale={locale} />
    </main>
  );
}
