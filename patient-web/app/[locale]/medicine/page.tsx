import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { catalogueHref } from "@/lib/catalogue-href";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The old /medicine index: the canonical catalogue is /c. Permanent. */
export default async function MedicineIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  permanentRedirect(catalogueHref(locale, sp));
}
