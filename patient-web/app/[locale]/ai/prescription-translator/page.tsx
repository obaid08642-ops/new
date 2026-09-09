import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { PrescriptionTranslatorClient } from "@/components-next/prescription-translator-client";

type Props = { params: Promise<{ locale: string }> };

export default async function PrescriptionTranslatorPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/ai`}>{ar ? "الذكاء الاصطناعي" : "AI"}</Link>
      <h1>{ar ? "مترجم الوصفات" : "Prescription translator"}</h1>
      <p>{ar ? "ارفع صورة الوصفة لقراءتها — حد أقصى 8MB." : "Upload a prescription image to read it — max 8MB."}</p>
      <PrescriptionTranslatorClient locale={locale} />
    </main>
  );
}
