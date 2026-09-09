import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { PharmacyBarcodeClient } from "@/components-next/pharmacy-barcode-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app barcode-scanner: manual code entry + /medicines/by-barcode + AI/manual fallbacks. */
export default async function PharmacyBarcodePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/pharmacy`}>{ar ? "الصيدلية" : "Pharmacy"}</Link>
      <h1>{ar ? "مسح الباركود" : "Scan barcode"}</h1>
      <PharmacyBarcodeClient locale={locale} />
    </main>
  );
}
