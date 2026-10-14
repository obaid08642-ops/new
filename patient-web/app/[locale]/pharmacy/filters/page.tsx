import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { catalogueHref } from "@/lib/catalogue-href";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Merged into the catalogue (second pass, section 3): the category is a chip on /c, so the old filters page redirects to it with the chosen category; the old `sort` is not carried over. */
export default async function PharmacyFiltersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  redirect(catalogueHref(locale, sp));
}
