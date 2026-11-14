import { JsonLd } from "@/components-next/json-ld";
import { hospital, medicalClinic, breadcrumbList, medicalWebPage } from "@/lib/seo/structured-data";
import { DirectAnswer } from "@/components-next/seo/direct-answer";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { patientApiUrl } from "@/lib/api/upstream";
import { readPublicEntity } from "@/lib/api/public-read";
import { CONSULT, ActionLinks, Facts, RowCard, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { ChipSet, LandingPage, LandingSection } from "@/components-next/landing/landing-kit";
import { FacilityMap } from "@/components-next/facility/facility-map";
import { directionsHref, facilityHoursRows, facilityPoint, type FacilityHoursRow } from "@/lib/facility/hours";
import { pickText } from "@/components-next/diagnostics/diag-parts";
import facilityStyles from "@/components-next/facility/facility.module.css";
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
    address?: string | null;
    logo?: string | null;
    lat?: number | null;
    lng?: number | null;
    working_hours?: FacilityHoursRow[] | null;
    accepted_insurance?: string[] | null;
  } | null;
  relationships?: { departments?: string[] | null; doctors?: Array<{ id?: string; slug?: string | null; name_ar?: string | null; name_en?: string | null; specialty?: string | null }> | null } | null;
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
  const seo = await getTranslations("SeoAnswer");
  const fac = data.entity;
  const departments = data.relationships?.departments ?? [];
  const insurance = fac.accepted_insurance ?? [];
  const name = pickText(locale, fac.name_ar ?? undefined, fac.name_en ?? undefined) ?? "";
  const schemaBuilder = fac.type === "hospital" ? hospital : medicalClinic;
  const place = [fac.city, fac.district].filter(Boolean).join(" - ");
  const KINDS = { hospital: "kindHospital", clinic: "kindClinic", medical_center: "kindMedicalCenter", polyclinic: "kindPolyclinic" } as const;
  const kind = seo(KINDS[fac.type as keyof typeof KINDS] ?? "kindFacility");
  const doctorCount = data.relationships?.doctors?.length ?? 0;
  // AEO: what and where the facility is, from its own record only.
  const directAnswer = [
    fac.city ? seo("facilityWho", { name, kind, city: fac.city }) : seo("facilityWhoNoCity", { name, kind }),
    doctorCount > 0 ? seo("facilityDoctors", { count: doctorCount }) : null,
  ];
  const facts: FactRow[] = [
    ...(place ? [{ label: t("facility.location"), value: place, icon: "map-pin" as const, tone: CONSULT.tone }] : []),
    ...(fac.address ? [{ label: t("facility.address"), value: fac.address }] : []),
    ...(fac.phone ? [{ label: t("facility.phone"), value: <span dir="ltr">{fac.phone}</span> }] : []),
  ];
  // only what the record has: no pin, no hours, no doctors → the section is not drawn
  const point = facilityPoint(fac.lat, fac.lng);
  const hours = facilityHoursRows(locale, fac.working_hours ?? [], t("facility.closed"));
  const doctors = (data.relationships?.doctors ?? []).flatMap((doc) => {
    const docName = pickText(locale, doc.name_ar ?? undefined, doc.name_en ?? undefined);
    const key = doc.slug || doc.id;
    return docName && key ? [{ key, name: docName, specialty: doc.specialty ?? undefined }] : [];
  });
  const actions = [
    ...(fac.phone ? [{ href: `tel:${fac.phone}`, label: t("facility.call"), external: true }] : []),
    ...(point ? [{ href: directionsHref(point), label: t("facility.directions"), external: true }] : []),
    { href: `/${locale}/consultations`, label: t("facility.book") },
  ];

  return (
    <LandingPage locale={locale} title={name} backHref={`/${locale}/consultations`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO); the breadcrumb points at /consultations, /consultations/clinics has no list page (needs-review issue 793) */}
      <DirectAnswer sentences={directAnswer} />
      <JsonLd data={[medicalWebPage({ title: name, locale: locale as Locale, path: `/facility/${slug}`, speakable: true }), schemaBuilder({ name, path: `/facility/${slug}`, locale: locale as Locale, city: fac.city, district: fac.district }), breadcrumbList([{ name: "Nabd Plus", locale: locale as Locale, path: "/" }, { name: t("ld.crumbFacilities"), locale: locale as Locale, path: "/consultations" }, { name, locale: locale as Locale, path: `/facility/${slug}` }])]} />

      {fac.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- the facility's own logo, any host; alt is its name
        <img src={fac.logo} alt={name} width={72} height={72} loading="lazy" className={facilityStyles.logo} />
      ) : null}

      {facts.length ? (
        <SectionCard id="facility-facts">
          <Facts rows={facts} />
        </SectionCard>
      ) : null}

      {point ? <FacilityMap lat={point.lat} lng={point.lng} label={name} hint={fac.address ?? undefined} pinLabel={t("facility.pinLabel", { name })} /> : null}

      {hours.length ? (
        <SectionCard id="facility-hours" title={t("facility.hours")}>
          <Facts rows={hours} />
        </SectionCard>
      ) : null}

      {doctors.length ? (
        <LandingSection id="doctors" title={t("facility.doctors")}>
          {doctors.map((doc) => <RowCard key={doc.key} href={`/${locale}/doctor/${encodeURIComponent(doc.key)}`} title={doc.name} sub={doc.specialty} />)}
        </LandingSection>
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

      <ActionLinks actions={actions} />
    </LandingPage>
  );
}
