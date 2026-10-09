import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Parity with app drug-scanner: merged into the one "scan a medicine" screen (pharmacy/barcode); the interaction check is a section of it. The query is kept. */
export default async function DrugScannerPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectKeepingQuery(`/${locale}/pharmacy/barcode`, await searchParams);
}
