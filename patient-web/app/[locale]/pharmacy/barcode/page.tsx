import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { BarcodeScreen } from "@/components-next/pharmacy/barcode-screen";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "PharmacyBarcode" });
  return { title: t("title") };
}

/** Find a medicine by the barcode on its package (canvas/PharmacyHub family). */
export default async function PharmacyBarcodePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  return <BarcodeScreen locale={locale} />;
}
