import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { catalogueHref } from "@/lib/catalogue-href";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The old /medicine/[slug] product page (a second copy of /p/[slug]): permanently redirected to the canonical product page, which keeps the metadata and JSON-LD. */
export default async function MedicineSlugPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  void searchParams;
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // keep the raw segment
  }
  permanentRedirect(`/${locale}/p/${encodeURIComponent(decoded)}`);
}
