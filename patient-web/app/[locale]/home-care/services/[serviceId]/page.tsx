import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components-next/json-ld";
import { DirectAnswer } from "@/components-next/seo/direct-answer";
import { breadcrumbList, medicalWebPage, nursingService } from "@/lib/seo/structured-data";
import { localizedUrl } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareService, findHomeCareServiceInCatalog, parseHomeCareServiceId } from "@/lib/api/home-care-services";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { getPatientHomeCareService } from "@/lib/api/home-care-services-server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { isLocale, locales } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Facts, Hero, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { NURSING, ServiceChips, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { money, pickText } from "@/components-next/diagnostics/diag-parts";
import consult from "@/components-next/consult/consult.module.css";
import { ButtonLink } from "@/components-next/pharmacy/button-link";

type Props = { params: Promise<{ locale: string; serviceId: string }> };

/** The public catalogue entry for this service (what crawlers and signed-out patients read). */
async function publicService(serviceId: string) {
  if (!parseHomeCareServiceId(serviceId).success) return null;
  const catalog = await getPublicNursingCatalog().catch(() => null);
  if (!catalog || !catalog.ok) return null;
  return findHomeCareServiceInCatalog(await catalog.json().catch(() => null), serviceId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) return {};
  const service = await publicService(serviceId);
  if (!service) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "NursingWeb" });
  const seo = await getTranslations({ locale, namespace: "SeoAnswer" });
  const name = pickText(locale, service.nameAr, service.nameEn) ?? t("serviceTitle");
  const description = (pickText(locale, service.descriptionAr, service.descriptionEn) ?? seo("homeCareWho", { name })).replace(/\s+/g, " ").slice(0, 160);
  const path = `/home-care/services/${encodeURIComponent(serviceId)}`;
  const canonical = localizedUrl(locale, path);
  return {
    title: `${name} | ${t("serviceTitle")}`,
    description,
    alternates: { canonical, languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, path)])), "x-default": localizedUrl("ar", path) } },
    openGraph: { type: "website", url: canonical, title: name, description },
    robots: { index: true, follow: true },
  };
}

/** One home care service (canvas/ServiceHub detail): its name, what it is, the price and duration, and whether insurance covers it. */
export default async function HomeCareServicePage({ params }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const seo = await getTranslations("SeoAnswer");
  // issue 650: the service page is public. A signed-in patient reads the service endpoint; everyone else (and a patient whose
  // session has ended) reads the service out of the public catalog. Signing in is asked for at booking, not here.
  if (!parseHomeCareServiceId(serviceId).success) notFound();
  const back = `/${locale}/nursing/catalog`;
  const token = await getOptionalPatientAccessToken();
  let service: ReturnType<typeof extractHomeCareService> = null;
  let reachable = true;
  if (token) {
    const response = await getPatientHomeCareService(serviceId, token);
    if (response.ok) service = extractHomeCareService(await response.json().catch(() => null));
    else if (response.status === 403 || response.status === 404) notFound();
    else if (response.status !== 401) reachable = false;
  }
  if (!service && reachable) {
    const catalog = await getPublicNursingCatalog();
    if (!catalog || !catalog.ok) reachable = false;
    else service = findHomeCareServiceInCatalog(await catalog.json().catch(() => null), serviceId);
  }
  if (!service && !reachable) {
    return (
      <ConsultPage locale={locale} title={t("serviceTitle")} backHref={back}>
        <ConsultState kind="error" title={t("serviceUnavailableTitle")} body={t("serviceUnavailableBody")} retryLabel={t("retry")} actionLabel={t("back")} actionHref={back} />
      </ConsultPage>
    );
  }
  if (!service) notFound();
  const name = pickText(locale, service.nameAr, service.nameEn) ?? "";
  const description = pickText(locale, service.descriptionAr, service.descriptionEn);
  const duration = [service.durationValue, service.duration].filter(Boolean).join(" ");
  const rows: FactRow[] = [
    ...(service.price !== undefined ? [{ label: t("priceLabel"), value: money(locale, service.price), icon: "tag" as const, tone: NURSING.tone }] : []),
    ...(duration ? [{ label: t("durationLabel"), value: duration, icon: "clock-counter-clockwise" as const, tone: NURSING.tone }] : []),
  ];
  return (
    <ConsultPage locale={locale} title={name || t("serviceTitle")} backHref={back}>
      <JsonLd data={[
        medicalWebPage({ title: name || t("serviceTitle"), locale, path: `/home-care/services/${serviceId}`, description: description ?? null, speakable: true }),
        nursingService({ name: name || t("serviceTitle"), locale, path: `/home-care/services/${serviceId}`, description: description ?? null }),
        breadcrumbList([{ name: t("serviceTitle"), locale, path: "/nursing/catalog" }, { name: name || t("serviceTitle"), locale, path: `/home-care/services/${serviceId}` }]),
      ]} />
      <Hero icon={serviceIcon(service.nameAr, service.nameEn)} tone={NURSING.tone} title={name} sub={t("eyebrow")}>
        <ServiceChips insurance={service.insuranceAvailable ? t("insurance") : undefined} />
      </Hero>
      <DirectAnswer sentences={[seo("homeCareWho", { name: name || t("serviceTitle") })]} />
      {description ? (
        <SectionCard id="service-about" title={t("aboutTitle")}>
          <p className={consult.body}>{description}</p>
        </SectionCard>
      ) : null}
      {rows.length > 0 ? (
        <SectionCard id="service-facts">
          <Facts rows={rows} label={t("serviceTitle")} />
        </SectionCard>
      ) : null}
      {/* journeys#60 (issue 1069): the service is booked on the website too (the book page asks for sign-in) */}
      <ButtonLink href={`/${locale}/home-care/services/${encodeURIComponent(serviceId)}/book`} label={t("bookCta")} fullWidth />
    </ConsultPage>
  );
}
