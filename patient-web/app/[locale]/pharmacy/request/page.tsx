import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RequestScreen } from "@/components-next/pharmacy/request-screen";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "PharmacyRequest" });
  return { title: t("title") };
}

/** Ask the nearby pharmacies for a medicine by name (the merged manual-order, custom-item and drug-not-found screens). */
export default async function PharmacyRequestPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  return <RequestScreen locale={locale} />;
}
