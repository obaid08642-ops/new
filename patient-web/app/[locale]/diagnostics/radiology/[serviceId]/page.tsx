import { JsonLd } from "@/components-next/json-ld";
import { CatalogueViewBeacon } from "@/components-next/diagnostics/catalogue-view-beacon";
import { service as serviceLd, breadcrumbList, medicalWebPage } from "@/lib/seo/structured-data";
import { DirectAnswer } from "@/components-next/seo/direct-answer";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseRadiologyService } from "@/lib/api/radiology";
import { getPublicRadiologyServiceDetail } from "@/lib/api/radiology-server";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, BulletList, Facts, Hero, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { RADIOLOGY, TagRow, hoursText, minutesText, money, type Tag } from "@/components-next/diagnostics/diag-parts";
import { OffersSection } from "@/components-next/diagnostics/offers-section";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { pickName, pickTexts, perLocaleOf } from "@/lib/i18n/localized";
import { LocalizedField, LocalizedList } from "@/components-next/ui/localized-field";
import { preparationField } from "@/lib/ordering/item";

type Props = { params: Promise<{ locale: string; serviceId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ serviceId: string; locale: string }> }): Promise<Metadata> {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RadiologyServices" });
  const seo = await getTranslations({ locale, namespace: "SeoAnswer" });
  const response = await getPublicRadiologyServiceDetail(serviceId).catch(() => null);
  const service = response && response.ok ? parseRadiologyService(await response.json().catch(() => null)) : null;
  // An unknown or unpublished service is not indexed (the page answers 404 or the error state).
  if (!service) return { robots: { index: false, follow: false } };
  const name = pickName(locale, service.names) ?? t("title");
  const description = (pickTexts(locale, service.descriptions) ?? seo("radiologyWho", { name })).replace(/\s+/g, " ").slice(0, 160);
  const path = `/diagnostics/radiology/${encodeURIComponent(serviceId)}`;
  const canonical = localizedUrl(locale, path);
  return {
    title: `${name} | ${t("title")}`,
    description,
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, path)])), "x-default": localizedUrl("ar", path) },
    },
    openGraph: { type: "website", url: canonical, title: name, description },
    robots: { index: true, follow: true },
  };
}

/** schema.org MedicalImagingTechnique for the catalogue modality (none when it does not map). */
const IMAGING: Record<string, string> = { ct: "CT", mri: "MRI", ultrasound: "Ultrasound", us: "Ultrasound", xray: "XRay", "x-ray": "XRay", pet: "PET", radiography: "Radiography" };

/** A radiology service (canvas/ServiceHub, the detail): the tile, the name, the facts the catalogue sent, the preparation, and the one action the web has for it, adding it to the diagnostics order. */
export default async function RadiologyServiceDetailPage({ params }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("RadiologyServices");
  const w = await getTranslations("DiagWeb");
  const seo = await getTranslations("SeoAnswer");

  let service = null;
  let response;
  try {
    response = await getPublicRadiologyServiceDetail(serviceId);
    if (response && response.status === 404) notFound();
    if (response && response.ok) {
      service = parseRadiologyService(await response.json().catch(() => null));
    }
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") throw err;
  }
  if (response?.status === 404) notFound();
  const backHref = `/${locale}/diagnostics/radiology`;
  if (!service) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
        <ConsultState kind="error" title={t("detailBlocked")} body={t("invalidResponse")} retryLabel={t("retry")} actionLabel={t("backToRadiology")} actionHref={backHref} />
      </ConsultPage>
    );
  }

  const name = pickName(locale, service.names);
  const description = pickTexts(locale, service.descriptions);
  const preparation = preparationField(locale, service);
  const tags: Tag[] = [
    ...(service.homeVisitSupported ? [{ label: t("homeVisit"), tone: RADIOLOGY.tone } as Tag] : []),
    ...(service.facilityVisitSupported ? [{ label: t("facilityVisit"), tone: DIAG_TONES.facility } as Tag] : []),
    ...(service.contrastRequired ? [{ label: w("tagContrast"), tone: DIAG_TONES.warn } as Tag] : []),
    ...(service.fastingRequired ? [{ label: w("tagFasting"), tone: DIAG_TONES.warn } as Tag] : []),
  ];
  const rows: FactRow[] = [
    // with the offer summary the price is what the centres below charge; the catalogue's base price is the fallback of an older answer
    ...(service.price !== undefined && service.offer === undefined ? [{ label: w("factPrice"), value: <bdi>{money(locale, service.price)}</bdi>, icon: "tag", tone: RADIOLOGY.tone } as FactRow] : []),
    ...(service.modality ? [{ label: w("factModality"), value: service.modality.toUpperCase(), icon: "scan", tone: RADIOLOGY.tone } as FactRow] : []),
    ...(service.bodyPart ? [{ label: w("factBodyPart"), value: service.bodyPart, icon: "heartbeat", tone: DIAG_TONES.health } as FactRow] : []),
    ...(service.durationMinutes !== undefined ? [{ label: w("factDuration"), value: minutesText(locale, service.durationMinutes), icon: "clock-counter-clockwise", tone: DIAG_TONES.facility } as FactRow] : []),
    ...(service.turnaroundHours !== undefined ? [{ label: w("factResult"), value: hoursText(locale, service.turnaroundHours), icon: "file-text", tone: DIAG_TONES.info } as FactRow] : []),
  ];
  const addHref = `/${locale}/labs/${encodeURIComponent(service.id)}?kind=radiology`;

  return (
    <ConsultPage locale={locale} title={name ?? t("title")} backHref={backHref}>
      <CatalogueViewBeacon vertical="radiology" serviceId={service.id} />
      <JsonLd data={[
        medicalWebPage({ title: name ?? t("title"), locale, path: `/diagnostics/radiology/${serviceId}`, description: description ?? null, speakable: true }),
        {
          "@context": "https://schema.org",
          "@type": "ImagingTest",
          name: name ?? t("title"),
          ...(description ? { description } : {}),
          ...(service.modality && IMAGING[service.modality.toLowerCase()] ? { imagingTechnique: `https://schema.org/${IMAGING[service.modality.toLowerCase()]}` } : {}),
          ...(service.bodyPart ? { bodyLocation: service.bodyPart } : {}),
          url: localizedUrl(locale, `/diagnostics/radiology/${encodeURIComponent(serviceId)}`),
          inLanguage: locale,
        },
        serviceLd({ name: name ?? t("title"), path: `/diagnostics/radiology/${serviceId}`, locale, description: description ?? null }), breadcrumbList([{ name: t("title"), locale, path: "/diagnostics/radiology" }, { name: name ?? t("title"), locale, path: `/diagnostics/radiology/${serviceId}` }])]} />
      <Hero icon={RADIOLOGY.icon} tone={RADIOLOGY.tone} title={name ? <LocalizedField locale={locale} ar={service.names.ar} en={service.names.en} /> : t("title")} sub={description ? <LocalizedField locale={locale} ar={service.descriptions.ar} en={service.descriptions.en} perLocale={perLocaleOf(service.descriptions)} /> : t("detailDescriptionUnavailable")}>
        <TagRow tags={tags} />
      </Hero>
      <DirectAnswer sentences={[seo("radiologyWho", { name: name ?? t("title") })]} />
      {rows.length > 0 ? <SectionCard id="rad-facts" title={t("detailTitle")}><Facts rows={rows} label={t("detailTitle")} /></SectionCard> : null}
      {preparation.items.length > 0 ? <SectionCard id="rad-prep" title={t("preparationTitle")}><LocalizedList locale={locale} field={preparation}>{(items) => <BulletList items={items} />}</LocalizedList></SectionCard> : null}
      <OffersSection locale={locale} t={w} kind="radiology" serviceId={service.id} offer={service.offer} offers={service.offers} price={service.price} bookLabel={w("addToOrderCta")} />
      {/* a scan no centre offers yet shows the order button disabled inside the section above, with the line and "Notify me" */}
      {service.offer?.providersCount === 0 ? null : <ActionLinks actions={[{ href: addHref, label: w("addToOrderCta") }]} />}
    </ConsultPage>
  );
}
