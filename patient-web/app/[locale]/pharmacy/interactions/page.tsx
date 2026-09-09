import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DrugInteractionChecker } from "@/components-next/drug-interaction-checker";

type Props = { params: Promise<{ locale: string }> };

export default async function DrugInteractionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/pharmacy`}>{ar ? "الصيدلية" : "Pharmacy"}</Link>
      <h1>{ar ? "فاحص تفاعلات الأدوية" : "Drug interaction checker"}</h1>
      <p>{ar ? "يفحص الخادم أدويتك الحالية مع المدخلة ويرجع التفاعلات المعروفة فقط." : "The server checks your current medications against the entered ones."}</p>
      <DrugInteractionChecker locale={locale} />
    </main>
  );
}
