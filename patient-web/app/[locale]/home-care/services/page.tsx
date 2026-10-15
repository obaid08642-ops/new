import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { redirectKeepingQuery } from "@/lib/redirect-keep-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** journeys#63: one nursing services list on the web, /nursing/catalog (public, indexed, with the search); this kept a second one. */
export default async function HomeCareServicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectKeepingQuery(`/${locale}/nursing/catalog`, await searchParams);
}
