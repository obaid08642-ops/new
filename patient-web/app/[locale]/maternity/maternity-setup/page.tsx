import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { MaternitySetupClient } from "@/components-next/maternity-setup-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app maternity-setup: cycle/pregnancy paths, POST /maternity/profile. */
export default async function MaternitySetupPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/maternity`}>{ar ? "الأمومة" : "Maternity"}</Link>
      <h1>{ar ? "إعداد ملف الأمومة" : "Maternity profile setup"}</h1>
      <p>{ar ? "اختر المسار المناسب لك." : "Choose your path."}</p>
      <MaternitySetupClient locale={locale} />
    </main>
  );
}
