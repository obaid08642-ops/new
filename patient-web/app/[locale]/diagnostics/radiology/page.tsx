import { SUGGEST_SCOPES } from "@/lib/search/suggest";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicRadiologyModalities } from "@/lib/api/radiology-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ConsultPage } from "@/components-next/consult/consult-page";
import consult from "@/components-next/consult/consult.module.css";
import { CheckField, SearchForm } from "@/components-next/diagnostics/diag-parts";
import { catalogueList } from "@/components-next/diagnostics/catalogue-list";
import styles from "@/components-next/diagnostics/diag.module.css";
import type { Metadata } from "next";
import Link from "next/link";
import { radiologyFilterCount } from "@/lib/diagnostics-filter-count";
import { parseDiagArt, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import { parseHubPages } from "@/lib/diagnostics-hub";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RadiologyServices" });
  const canonical = localizedUrl(locale, "/diagnostics/radiology");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/diagnostics/radiology")])), "x-default": localizedUrl("ar", "/diagnostics/radiology") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const on = (value: string | string[] | undefined) => first(value) === "1";

/**
 * The radiology catalogue (canvas/ServiceHub, the scans): a search and the documented filters in the URL. The list is the SAME
 * component and data source as the hub's radiology tab (the catalogue, every scan with its centres, from-price, where and insurance;
 * a scan no centre offers yet stays listed and its page offers "Notify me when available").
 */
export default async function RadiologyServicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const search = (first(query.search) ?? "").trim();
  const modality = first(query.modality) ?? "";
  const bodyPart = first(query.body_part) ?? "";
  const cat = parseDiagArt(first(query.cat), "radiology");
  const pages = parseHubPages(first(query.more));
  const t = await getTranslations("RadiologyServices");
  const w = await getTranslations("DiagWeb");
  const backHref = `/${locale}/diagnostics?kind=radiology`;
  const modalitiesResult = await getPublicRadiologyModalities().catch(() => null);
  // "Lowest price" and "Highest rated" order the list on the SERVER (GET /radiology/services: lowest_price, highest_rated; the rating is the mean of the centres that perform the scan)
  const lowestPrice = on(query.lowest_price);
  const highestRated = on(query.highest_rated);
  const homeVisit = on(query.home_visit);
  const activeCount = radiologyFilterCount({ modality, bodyPart, homeVisit, lowestPrice, highestRated });
  const modalityValues = modalitiesResult?.ok ? ((await modalitiesResult.json().catch(() => null)) as unknown) : [];
  const modalityList = Array.isArray(modalityValues) ? modalityValues.filter((x): x is string => typeof x === "string") : [];
  // the address keeps every filter of the page; a chip or "Show more" changes only its own part
  const href = (over: { cat?: DiagArtKey | "all"; more?: number }) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (modality) params.set("modality", modality);
    if (bodyPart) params.set("body_part", bodyPart);
    if (homeVisit) params.set("home_visit", "1");
    if (lowestPrice) params.set("lowest_price", "1");
    if (highestRated) params.set("highest_rated", "1");
    const nextCat = over.cat ?? cat;
    if (nextCat !== "all") params.set("cat", nextCat);
    if (over.more && over.more > 1) params.set("more", String(over.more));
    const qs = params.toString();
    return `/${locale}/diagnostics/radiology${qs ? `?${qs}` : ""}`;
  };

  const list = await catalogueList({
    kind: "radiology",
    locale,
    search,
    cat,
    pages,
    filters: { modality: modality || undefined, bodyPart: bodyPart || undefined, homeVisit, lowestPrice, highestRated },
    chipHref: (next) => href({ cat: next }),
    moreHref: href({ more: Math.min(pages + 1, 10) }),
    detailHref: true,
  });

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={backHref} resultsHref={`/${locale}/diagnostics/bookings`}>
      <p className={styles.flowNote}>{t("subtitle")}</p>
      <SearchForm
        suggest={{ locale, scope: SUGGEST_SCOPES.radiology }}
        name="search"
        defaultValue={search}
        placeholder={t("searchPlaceholder")}
        label={t("searchLabel")}
        submitLabel={t("apply")}
        below={
          <>
            <div className={consult.two}>
              <select className={consult.control} name="modality" defaultValue={modality} aria-label={t("modalityLabel")}>
                <option value="">{t("allModalities")}</option>
                {modalityList.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
              </select>
              <input className={consult.control} name="body_part" defaultValue={bodyPart} placeholder={t("bodyPartPlaceholder")} aria-label={t("bodyPartLabel")} />
            </div>
            <div className={styles.checks}>
              <CheckField name="home_visit" label={t("homeVisit")} defaultChecked={homeVisit} />
              <CheckField name="lowest_price" label={t("lowestPrice")} defaultChecked={lowestPrice} />
              <CheckField name="highest_rated" label={w("sortRating")} defaultChecked={highestRated} />
            </div>
          </>
        }
      />
      {activeCount > 0 || search ? (
        <div className={styles.chipsRow} role="group" aria-label={t("filtersOn", { count: activeCount })}>
          <span>{t("filtersOn", { count: activeCount })}</span>
          <Link href={`/${locale}/diagnostics/radiology`} className={consult.activeFilterClear}>{t("reset")}</Link>
        </div>
      ) : null}
      {list}
    </ConsultPage>
  );
}
