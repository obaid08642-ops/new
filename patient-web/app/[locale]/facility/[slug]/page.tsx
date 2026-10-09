import { JsonLd } from "@/components-next/json-ld";
import { hospital, medicalClinic, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { patientApiUrl } from "@/lib/api/upstream";
import { readPublicEntity } from "@/lib/api/public-read";
import { CONSULT, ActionLinks, Facts, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { ChipSet, LandingPage, LandingSection } from "@/components-next/landing/landing-kit";
import { pickText } from "@/components-next/diagnostics/diag-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";

type Props = { params: Promise<{ locale: string; slug: string }> };

type FacilityAnswer = {
  entity?: {
    name_ar?: string | null;
    name_en?: string | null;
    type?: string | null;
    city?: string | null;
    district?: string | null;
    phone?: string | null;
    accepted_insurance?: string[] | null;
  } | null;
  relationships?: { departments?: string[] | null } | null;
};

function getFacility(slug: string) {
  return readPublicEntity<FacilityAnswer>(patientApiUrl(`/entity-graph/related/facility/${encodeURIComponent(slug)}`), 3600);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await getFacility(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const fac = data.entity;
  const name = (locale === "ar" ? fac.name_ar || fac.name_en : fac.name_en || fac.name_ar) ?? "";
  const canonical = localizedUrl(locale as Locale, `/facility/${encodeURIComponent(slug)}`);
  const desc = t("meta.facility.description", { name, city: fac.city || t("meta.facility.country") });
  return { title: t("meta.facility.title", { name }), description: desc, alternates: { canonical, languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/facility/${encodeURIComponent(slug)}`)])), "x-default": localizedUrl("ar", `/facility/${encodeURIComponent(slug)}`) } }, openGraph: { title: name, description: desc, url: canonical, type: "website" }, robots: { index: true, follow: true } };
}

export default async function FacilityCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const data = await getFacility(slug);
  if (!data?.entity) notFound();
  const t = await getTranslations("PublicLanding");
  const fac = data.entity;
  const departments = data.relationships?.departments ?? [];
  const insurance = fac.accepted_insurance ?? [];
  const name = pickText(locale, fac.name_ar ?? undefined, fac.name_en ?? undefined) ?? "";
  const schemaBuilder = fac.type === "hospital" ? hospital : medicalClinic;
  const place = [fac.city, fac.district].filter(Boolean).join(" - ");
  const facts: FactRow[] = [
    ...(place ? [{ label: t("facility.location"), value: place, icon: "map-pin" as const, tone: CONSULT.tone }] : []),
    ...(fac.phone ? [{ label: t("facility.phone"), value: <span dir="ltr">{fac.phone}</span> }] : []),
  ];

  return (
    <LandingPage locale={locale} title={name} backHref={`/${locale}/consultations`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO) */}
      <JsonLd data={[schemaBuilder({ name, path: `/facility/${slug}`, locale: locale as Locale, city: fac.city, district: fac.district }), breadcrumbList([{ name: "Nabd Plus", locale: locale as Locale, path: "/" }, { name: locale === "ar" ? "المراكز والمستشفيات" : "Hospitals & Clinics", locale: locale as Locale, path: "/consultations/clinics" }, { name, locale: locale as Locale, path: `/facility/${slug}` }])]} />

      {facts.length ? (
        <SectionCard id="facility-facts">
          <Facts rows={facts} />
        </SectionCard>
      ) : null}

      {departments.length ? (
        <LandingSection id="departments" title={t("facility.departments")}>
          <ChipSet label={t("facility.departments")} items={departments} tone={CONSULT.tone} />
        </LandingSection>
      ) : null}

      {insurance.length ? (
        <LandingSection id="insurance" title={t("facility.insurance")}>
          <ChipSet label={t("facility.insurance")} items={insurance} tone={SERVICE_ICONS.insurance.tone} />
        </LandingSection>
      ) : null}

      <ActionLinks actions={[{ href: `/${locale}/consultations`, label: t("facility.book") }]} />
    </LandingPage>
  );
}
