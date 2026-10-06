import { JsonLd } from "@/components-next/json-ld";
import { service as serviceLd, breadcrumbList } from "@/lib/seo/structured-data";
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
import { RADIOLOGY, TagRow, hoursText, minutesText, money, pickText, type Tag } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string; serviceId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ serviceId: string; locale: string }> }): Promise<Metadata> {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RadiologyServices" });
  const canonical = localizedUrl(locale, `/diagnostics/radiology/${encodeURIComponent(serviceId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, canonical.replace(`/${locale}`, ""))])), "x-default": localizedUrl("ar", canonical.replace(`/${locale}`, "")) },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

/** A radiology service (canvas/ServiceHub, the detail): the tile, the name, the facts the catalogue sent, the preparation, and the one action the web has for it, adding it to the diagnostics order. */
export default async function RadiologyServiceDetailPage({ params }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("RadiologyServices");
  const w = await getTranslations("DiagWeb");

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

  const name = pickText(locale, service.nameAr, service.nameEn);
  const description = pickText(locale, service.descriptionAr, service.descriptionEn);
  const preparation = (locale === "ar" || locale === "ur" ? service.preparationAr ?? service.preparationEn : service.preparationEn ?? service.preparationAr) ?? [];
  const tags: Tag[] = [
    ...(service.homeVisitSupported ? [{ label: t("homeVisit"), tone: RADIOLOGY.tone } as Tag] : []),
    ...(service.facilityVisitSupported ? [{ label: t("facilityVisit"), tone: "teal" } as Tag] : []),
    ...(service.contrastRequired ? [{ label: w("tagContrast"), tone: "amber" } as Tag] : []),
    ...(service.fastingRequired ? [{ label: w("tagFasting"), tone: "amber" } as Tag] : []),
  ];
  const rows: FactRow[] = [
    ...(service.price !== undefined ? [{ label: w("factPrice"), value: <bdi>{money(locale, service.price)}</bdi>, icon: "tag", tone: RADIOLOGY.tone } as FactRow] : []),
    ...(service.modality ? [{ label: w("factModality"), value: service.modality.toUpperCase(), icon: "scan", tone: RADIOLOGY.tone } as FactRow] : []),
    ...(service.bodyPart ? [{ label: w("factBodyPart"), value: service.bodyPart, icon: "heartbeat", tone: "coral" } as FactRow] : []),
    ...(service.durationMinutes !== undefined ? [{ label: w("factDuration"), value: minutesText(locale, service.durationMinutes), icon: "clock-counter-clockwise", tone: "teal" } as FactRow] : []),
    ...(service.turnaroundHours !== undefined ? [{ label: w("factResult"), value: hoursText(locale, service.turnaroundHours), icon: "file-text", tone: "blue" } as FactRow] : []),
  ];
  const addHref = `/${locale}/diagnostics/cart?add=${encodeURIComponent(`rad_${service.id}`)}&name=${encodeURIComponent(name ?? "")}${service.price !== undefined ? `&price=${service.price}` : ""}`;

  return (
    <ConsultPage locale={locale} title={name ?? t("title")} backHref={backHref}>
      <JsonLd data={[serviceLd({ name: name ?? t("title"), path: `/diagnostics/radiology/${serviceId}`, locale, description: description ?? null }), breadcrumbList([{ name: t("title"), locale, path: "/diagnostics/radiology" }, { name: name ?? t("title"), locale, path: `/diagnostics/radiology/${serviceId}` }])]} />
      <Hero icon={RADIOLOGY.icon} tone={RADIOLOGY.tone} title={name ?? t("title")} sub={description ?? t("detailDescriptionUnavailable")}>
        <TagRow tags={tags} />
      </Hero>
      {rows.length > 0 ? <SectionCard id="rad-facts" title={t("detailTitle")}><Facts rows={rows} label={t("detailTitle")} /></SectionCard> : null}
      {preparation.length > 0 ? <SectionCard id="rad-prep" title={t("preparationTitle")}><BulletList items={preparation} /></SectionCard> : null}
      <ActionLinks actions={[{ href: addHref, label: w("addToOrderCta") }]} />
    </ConsultPage>
  );
}
