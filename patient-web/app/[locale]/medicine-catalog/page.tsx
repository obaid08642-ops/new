import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { catalogueHref } from "@/lib/catalogue-href";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Merged into the canonical catalogue /c (second pass, section 3). Permanent, so the ranking moves with it; `q` and `page` stay. The canonical pages /c and /p/[slug] keep their own metadata and JSON-LD. */
export default async function MedicineCatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  permanentRedirect(catalogueHref(locale, sp));
}
