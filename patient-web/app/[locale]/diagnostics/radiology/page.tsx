import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { getPublicRadiologyModalities, getPublicRadiologyServices } from "@/lib/api/radiology-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import consult from "@/components-next/consult/consult.module.css";
import { CheckField, RADIOLOGY, RadiologyTile, SearchForm, hoursText, minutesText, money, pickText, type Tag } from "@/components-next/diagnostics/diag-parts";
import styles from "@/components-next/diagnostics/diag.module.css";
import type { Metadata } from "next";

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
    getPublicRadiologyServices({ modality, bodyPart, search, homeVisit: on(query.home_visit) ? "true" : undefined, homeOnly: on(query.home_only) ? "true" : undefined, highestRated: on(query.highest_rated) ? "true" : undefined, nearest: on(query.nearest) ? "true" : undefined, lowestPrice: on(query.lowest_price) ? "true" : undefined }),
    getPublicRadiologyModalities(),
  ]);
  const t = await getTranslations("RadiologyServices");
  const w = await getTranslations("DiagWeb");
  const backHref = `/${locale}/diagnostics?kind=radiology`;
  if (!servicesResult?.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const services = extractRadiologyServices(await servicesResult.json().catch(() => null));
  const modalityValues = modalitiesResult?.ok ? ((await modalitiesResult.json().catch(() => null)) as unknown) : [];
  const modalityList = Array.isArray(modalityValues) ? modalityValues.filter((x): x is string => typeof x === "string") : [];

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
      <p className={styles.flowNote}>{t("subtitle")}</p>
      <SearchForm
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
              <CheckField name="home_visit" label={t("homeVisit")} defaultChecked={on(query.home_visit)} />
              <CheckField name="highest_rated" label={t("highestRated")} defaultChecked={on(query.highest_rated)} />
              <CheckField name="lowest_price" label={t("lowestPrice")} defaultChecked={on(query.lowest_price)} />
            </div>
          </>
        }
      />
      {services.length === 0 ? (
        <ConsultState kind="empty" icon="scan" tone={RADIOLOGY.tone} title={t("emptyTitle")} body={search || modality || bodyPart ? t("noMatch") : t("emptyBody")} />
      ) : (
        <ul className={styles.radGrid} aria-label={t("title")}>
          {services.map((service) => {
            const tags: Tag[] = [
              ...(service.homeVisitSupported ? [{ label: t("homeVisit"), tone: RADIOLOGY.tone } as Tag] : []),
              ...(service.facilityVisitSupported ? [{ label: t("facilityVisit"), tone: "teal" } as Tag] : []),
              ...(service.contrastRequired ? [{ label: w("tagContrast"), tone: "amber" } as Tag] : []),
            ];
            const sub = [
              service.modality?.toUpperCase(),
              service.bodyPart,
              service.price !== undefined ? w("fromPrice", { price: money(locale, service.price) }) : undefined,
              service.durationMinutes !== undefined ? minutesText(locale, service.durationMinutes) : undefined,
              service.turnaroundHours !== undefined ? w("resultWithin", { time: hoursText(locale, service.turnaroundHours) }) : undefined,
            ].filter(Boolean).join(" · ");
            return <RadiologyTile key={service.id} href={`/${locale}/diagnostics/radiology/${encodeURIComponent(service.id)}`} title={pickText(locale, service.nameAr, service.nameEn) ?? ""} sub={sub || undefined} tags={tags} imageUrl={service.imageUrl} />;
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
