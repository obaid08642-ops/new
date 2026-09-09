import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VitalsLogForm } from "@/components-next/vitals-log-form";

type Props = { params: Promise<{ locale: string }> };

export default async function VitalsLogPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/health/vitals`}>{ar ? "المؤشرات" : "Vitals"}</Link>
      <h1>{ar ? "تسجيل قراءة" : "Log reading"}</h1>
      <VitalsLogForm locale={locale} />
    </main>
  );
}
