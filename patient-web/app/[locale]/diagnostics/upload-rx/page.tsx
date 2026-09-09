import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app diagnostics/upload-rx: legacy route, upload lives in pharmacy/scan-prescription. */
export default async function DiagnosticsUploadRxPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/pharmacy/scan-prescription`);
}
