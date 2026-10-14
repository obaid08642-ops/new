import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Merged into diagnostics/sample-tracking (second pass, section 2): both read GET /labs/bookings/:id/tracking; the collector is a block of that page. The query is kept. */
export default async function DiagnosticsTechnicianTrackingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectKeepingQuery(`/${locale}/diagnostics/sample-tracking`, await searchParams);
}
