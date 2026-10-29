import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components-next/json-ld";
import { DirectAnswer } from "@/components-next/seo/direct-answer";
import { CardGrid, LandingEmpty, LandingPage, LandingSection, ServiceCard } from "@/components-next/landing/landing-kit";
import { NotifyMeButton } from "@/components-next/diagnostics/notify-me-button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { NURSING, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { money } from "@/components-next/diagnostics/diag-parts";
import { extractHomeCareService, type HomeCareService } from "@/lib/api/home-care-services";
import { readSegment } from "@/lib/api/entity-explore";
import { readPublicEntity } from "@/lib/api/public-read";
import { patientApiUrl } from "@/lib/api/upstream";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { pickName, pickTexts } from "@/lib/i18n/localized";
import { citiesOf, cityName, priceRange, publicNursingServices, serviceForToken, serviceTokens } from "@/lib/nursing/service-pages";
import { localizedUrl } from "@/lib/seo";
import { breadcrumbList, medicalWebPage, nursingService, service as serviceLd } from "@/lib/seo/structured-data";

type Props = { params: Promise<{ locale: string; citySlug: string; serviceSlug: string }> };

/** One home-nursing service in one city: /{locale}/home-nursing/{city}/{service}. A page exists only for an approved, non-duplicate catalogue service and a known city. */
const path = (citySlug: string, token: string) => `/home-nursing/${encodeURIComponent(citySlug)}/${encodeURIComponent(token)}`;

async function load(locale: Locale, citySlugRaw: string, serviceSlugRaw: string) {
  const citySlug = readSegment(citySlugRaw).toLowerCase();
  const [catalogue, cityPayload] = await Promise.all([
    readPublicEntity<unknown>(patientApiUrl("/home-care/services"), 3600),
    readPublicEntity<unknown>(patientApiUrl("/locations/cities"), 21600),
  ]);
  const services = publicNursingServices(catalogue);
  const found = serviceForToken(services, readSegment(serviceSlugRaw));
  const city = citiesOf(cityPayload).find((c) => c.slug === citySlug);
  if (!found || !city) return null;
  // the detail adds what each nurse offers (price, where, insurance); the list row alone is enough when it is not there
  const detail = await readPublicEntity<unknown>(patientApiUrl(`/home-care/services/${encodeURIComponent(found.service.id)}`), 3600).catch(() => null);
  const withOffers: HomeCareService = (detail ? extractHomeCareService(detail) : null) ?? found.service;
  return { token: found.token, service: withOffers, services, city, citySlug, cityLabel: cityName(locale, city, citySlug), name: pickName(locale, found.service.names) ?? "" };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, citySlug, serviceSlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await load(locale, citySlug, serviceSlug);
  if (!data || !data.name) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const vars = { service: data.name, city: data.cityLabel };
  const p = path(data.citySlug, data.token);
  const canonical = localizedUrl(locale, p);
  const title = t("meta.nursingService.title", vars);
  const description = t("meta.nursingService.description", vars);
  return {
    title,
    description,
    alternates: { canonical, languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, p)])), "x-default": localizedUrl("ar", p) } },
    openGraph: { title, description, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function HomeNursingServiceCityPage({ params }: Props) {
  const { locale, citySlug: citySlugRaw, serviceSlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const data = await load(locale, citySlugRaw, serviceSlug);
  if (!data || !data.name) notFound();

  const t = await getTranslations("PublicLanding");
  const seo = await getTranslations("SeoAnswer");
  const { service, name, cityLabel, citySlug, token } = data;
  const vars = { service: name, city: cityLabel };
  const p = path(citySlug, token);
  const range = priceRange(service.offers);
  const providers = service.offer?.providersCount ?? 0;
  const none = service.offer !== undefined && providers === 0;
  const description = pickTexts(locale, service.descriptions);
  const title = t("nursingService.title", vars);
  const related = serviceTokens(data.services).filter((x) => x.token !== token).slice(0, 8);

  return (
    <LandingPage locale={locale} title={title} intro={t("nursingService.intro", vars)} backHref={`/${locale}/home-nursing/${encodeURIComponent(citySlug)}`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO) */}
      <JsonLd
        data={[
          medicalWebPage({ title, path: p, locale, description: description ?? null, speakable: true }),
          breadcrumbList([
            { name: "Nabd Plus", locale, path: "/" },
            { name: t("ld.crumbHomeCare"), locale, path: "/home-care/services" },
            { name: cityLabel, locale, path: `/home-nursing/${encodeURIComponent(citySlug)}` },
            { name, locale, path: p },
          ]),
          // i18n-ok: structured data is kept exactly as published (SEO)
          nursingService({ name, path: p, locale, description: description ?? t("ld.nursingServiceCity", vars) }),
          // the offer range exists only when a nurse priced the service: nothing is invented for a service nobody offers yet
          serviceLd({ name, path: p, locale, provider: "Nabd Plus", description: t("ld.nursingServiceCity", vars), serviceType: "Home nursing", city: cityLabel, offers: range ?? null }),
        ]}
      />
      <DirectAnswer sentences={[seo("nursingServiceWho", vars), description]} />

      {range || providers > 0 ? (
        <LandingSection id="price" title={t("nursingService.priceTitle")}>
          {range ? (
            <p>{range.low === range.high ? t("nursingService.priceFrom", { price: money(locale, range.low) }) : t("nursingService.priceRange", { low: money(locale, range.low), high: money(locale, range.high) })}</p>
          ) : null}
          {providers > 0 ? <p>{t("nursingService.providers", { count: providers })}</p> : null}
          <ButtonLink href={`/${locale}/home-care/services/${encodeURIComponent(service.id)}/book`} label={t("nursingService.book")} />
        </LandingSection>
      ) : null}

      {none ? (
        <>
          <LandingEmpty icon={serviceIcon(service.nameAr, service.nameEn)} tone={NURSING.tone} title={t("nursingService.emptyTitle", vars)} body={t("nursingService.emptyBody", vars)} />
          <NotifyMeButton serviceType="nursing" serviceId={service.id} locale={locale} />
        </>
      ) : null}

      {related.length > 0 ? (
        <LandingSection id="related" title={t("nursingService.relatedTitle", vars)}>
          <CardGrid label={t("nursingService.relatedTitle", vars)}>
            {related.map(({ token: other, service: svc }) => (
              <li key={svc.id}>
                <ServiceCard
                  icon={serviceIcon(svc.nameAr, svc.nameEn)}
                  tone={NURSING.tone}
                  title={pickName(locale, svc.names) ?? ""}
                  actionHref={`/${locale}${path(citySlug, other)}`}
                  actionLabel={t("nursingService.about")}
                />
              </li>
            ))}
          </CardGrid>
          <p><a href={`/${locale}/home-nursing/${encodeURIComponent(citySlug)}`}>{t("nursingService.allServices", vars)}</a></p>
        </LandingSection>
      ) : null}
    </LandingPage>
  );
}
