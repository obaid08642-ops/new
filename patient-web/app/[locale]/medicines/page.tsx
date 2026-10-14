import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { catalogueHref } from "@/lib/catalogue-href";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Merged into the canonical catalogue /c (second pass, section 3: two catalogues become one). Permanent, so the ranking moves with it; the category becomes the path, `q` and `page` stay. */
export default async function MedicinesListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  permanentRedirect(catalogueHref(locale, sp));
}
