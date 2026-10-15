import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Parity with app diagnostics/upload-rx (journeys#59): legacy route; a lab request is booked as lab tests, so it opens the lab test search (not the pharmacy prescription scan). The query is kept. */
export default async function DiagnosticsUploadRxPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectKeepingQuery(`/${locale}/diagnostics/search`, await searchParams);
}
