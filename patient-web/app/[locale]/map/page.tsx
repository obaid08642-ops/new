import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapExplorerClient } from "@/components-next/map-explorer-client";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "MapExplorer" });
  const canonical = localizedUrl(locale, "/map");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/map")])),
        "x-default": localizedUrl("ar", "/map"),
      },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function MapExplorerPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("MapExplorer");

  return (
    <main style={{ minHeight: "calc(100vh - 80px)", position: "relative" }}>
      <MapExplorerClient
        locale={locale}
        labels={{
          title: t("title"),
          subtitle: t("subtitle"),
          searchPh: t("searchPh"),
          filterAll: t("filterAll"),
          filterDoctors: t("filterDoctors"),
          filterHospitals: t("filterHospitals"),
          filterPharmacies: t("filterPharmacies"),
          filterLabs: t("filterLabs"),
          filterNursing: t("filterNursing"),
          directions: t("directions"),
          book: t("book"),
          rating: t("rating"),
          distance: t("distance"),
          noProviders: t("noProviders"),
        }}
      />
    </main>
  );
}
