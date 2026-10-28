import { SUGGEST_SCOPES } from "@/lib/search/suggest";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { getPublicRadiologyModalities, getPublicRadiologyServices } from "@/lib/api/radiology-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import consult from "@/components-next/consult/consult.module.css";
import { CAT_LABEL, CheckField, RADIOLOGY, RadiologyTile, SearchForm, hoursText, minutesText, money, type Tag } from "@/components-next/diagnostics/diag-parts";
import styles from "@/components-next/diagnostics/diag.module.css";
import type { Metadata } from "next";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { pickName } from "@/lib/i18n/localized";
import Link from "next/link";
import { radiologyFilterCount } from "@/lib/diagnostics-filter-count";
import { ratingLine } from "@/components-next/diagnostics/catalog-rows";
import { diagArtKey, isMachineValue } from "@/components-next/ui-generated/icons/diag-art";

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

/** The radiology catalogue (canvas/ServiceHub, the scans): a search and the documented filters in the URL, one tile per live service. */
export default async function RadiologyServicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const search = (first(query.search) ?? "").trim();
  const modality = first(query.modality) ?? "";
  const bodyPart = first(query.body_part) ?? "";
  const [servicesResult, modalitiesResult] = await Promise.all([
    getPublicRadiologyServices({ modality, bodyPart, search, homeVisit: on(query.home_visit) ? "true" : undefined, homeOnly: on(query.home_only) ? "true" : undefined, lowestPrice: on(query.lowest_price) ? "true" : undefined, highestRated: on(query.highest_rated) ? "true" : undefined }),
    getPublicRadiologyModalities(),
  ]);
  const t = await getTranslations("RadiologyServices");
  const w = await getTranslations("DiagWeb");
  const backHref = `/${locale}/diagnostics?kind=radiology`;
  if (!servicesResult?.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref} resultsHref={`/${locale}/diagnostics/bookings`}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  // "Lowest price" and "Highest rated" order the list on the SERVER (GET /radiology/services: lowest_price, highest_rated; the rating is the mean of the centres that perform the scan)
  const lowestPrice = on(query.lowest_price);
  const highestRated = on(query.highest_rated);
  const services = extractRadiologyServices(await servicesResult.json().catch(() => null));
  const homeVisit = on(query.home_visit);
  const activeCount = radiologyFilterCount({ modality, bodyPart, homeVisit, lowestPrice, highestRated });
  const modalityValues = modalitiesResult?.ok ? ((await modalitiesResult.json().catch(() => null)) as unknown) : [];
  const modalityList = Array.isArray(modalityValues) ? modalityValues.filter((x): x is string => typeof x === "string") : [];

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
      {services.length === 0 ? (
        <ConsultState kind="empty" icon="scan" tone={RADIOLOGY.tone} title={t("emptyTitle")} body={search || activeCount > 0 ? t("noMatch") : t("emptyBody")} />
      ) : (
        <ul className={styles.radGrid} aria-label={t("title")}>
          {services.map((service) => {
            const tags: Tag[] = [
              ...(service.homeVisitSupported ? [{ label: t("homeVisit"), tone: RADIOLOGY.tone } as Tag] : []),
              ...(service.facilityVisitSupported ? [{ label: t("facilityVisit"), tone: DIAG_TONES.facility } as Tag] : []),
              ...(service.contrastRequired ? [{ label: w("tagContrast"), tone: DIAG_TONES.warn } as Tag] : []),
            ];
            const sub = [
              w(CAT_LABEL[diagArtKey({ kind: "radiology", category: service.category, modality: [service.modality, service.modalityCategory].filter(Boolean).join(" "), bodyPart: service.bodyPart, names: Object.values(service.names) })]),
              isMachineValue(service.bodyPart) ? undefined : service.bodyPart,
              ratingLine({ locale, tr: (key, values) => w(key, values) }, service.rating, service.ratingCount),
              service.price !== undefined ? w("fromPrice", { price: money(locale, service.price) }) : undefined,
              service.durationMinutes !== undefined ? minutesText(locale, service.durationMinutes) : undefined,
              service.turnaroundHours !== undefined ? w("resultWithin", { time: hoursText(locale, service.turnaroundHours) }) : undefined,
            ].filter(Boolean).join(" · ");
            return <RadiologyTile key={service.id} href={`/${locale}/diagnostics/radiology/${encodeURIComponent(service.id)}`} title={pickName(locale, service.names) ?? ""} sub={sub || undefined} tags={tags} imageUrl={service.imageUrl} />;
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
