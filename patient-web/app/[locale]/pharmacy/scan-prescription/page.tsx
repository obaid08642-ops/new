import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RxUploadScreen } from "@/components-next/pharmacy/rx-upload-screen";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RxUpload" });
  return { title: t("title") };
}

/** canvas/RxUpload: a patient session is needed (the photo and its medicines are saved to the patient's own record). */
export default async function ScanPrescriptionPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  return <RxUploadScreen locale={locale} />;
}
