import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Merged into pharmacy/broadcast-status (second pass, section 3): both read GET /patient/pharmacy/orders/:id and /offers, and the offers screen shows the waiting state, the refresh and the confirmed cancel. The query is kept. */
export default async function PharmacyWaitingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectKeepingQuery(`/${locale}/pharmacy/broadcast-status`, await searchParams);
}
