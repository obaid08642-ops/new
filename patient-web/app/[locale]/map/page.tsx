import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConsultPage } from "@/components-next/consult/consult-page";
import rx from "@/components-next/pharmacy/rx.module.css";
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

/** `/map`: the facilities explorer (public page; the list is GET /providers/map). */
export default async function MapExplorerPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("MapExplorer");

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}`} width="wide">
      <p className={rx.lead}>{t("subtitle")}</p>
      <MapExplorerClient
        locale={locale}
        labels={{
          searchPh: t("searchPh"),
          filterAll: t("filterAll"),
          filterDoctors: t("filterDoctors"),
          filterHospitals: t("filterHospitals"),
          filterPharmacies: t("filterPharmacies"),
          filterLabs: t("filterLabs"),
          filterNursing: t("filterNursing"),
          directions: t("directions"),
          book: t("book"),
          noProviders: t("noProviders"),
        }}
      />
    </ConsultPage>
  );
}
