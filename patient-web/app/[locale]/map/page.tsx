import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConsultPage } from "@/components-next/consult/consult-page";
import rx from "@/components-next/pharmacy/rx.module.css";
import { MapExplorerClient } from "@/components-next/map-explorer-client";
import { callPatientApi } from "@/lib/api/upstream";
import { parseMapType } from "@/lib/map/entry";
import { extractCityNames } from "@/lib/api/city-names";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ type?: string | string[] }> };

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

/** `/map`: the facilities explorer (public page; the list is GET /providers/map). */
export default async function MapExplorerPage({ params, searchParams }: Props) {
  const { locale } = await params;
  // `?type=pharmacy` (the entries on Home and the lists) opens the map filtered to that kind
  const initialType = parseMapType((await searchParams)?.type);
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("MapExplorer");
  // the cities the map draws are stored in Arabic; the public city list gives the English name for the other pages
  const cities = locale === "ar" ? null : await callPatientApi("/locations/cities").catch(() => null);
  const cityNames = cities && cities.ok ? extractCityNames(await cities.json().catch(() => null)) : undefined;

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}`} width="wide">
      <p className={rx.lead}>{t("subtitle")}</p>
      <MapExplorerClient
        key={initialType ?? "all"}
        locale={locale}
        cityNames={cityNames}
        initialType={initialType}
        labels={{
          searchPh: t("searchPh"),
          filterAll: t("filterAll"),
          filterDoctors: t("filterDoctors"),
          filterHospitals: t("filterHospitals"),
          filterPharmacies: t("filterPharmacies"),
          filterLabs: t("filterLabs"),
          filterRadiology: t("filterRadiology"),
          filterNursing: t("filterNursing"),
          directions: t("directions"),
          book: t("book"),
          noProviders: t("noProviders"),
        }}
      />
    </ConsultPage>
  );
}
