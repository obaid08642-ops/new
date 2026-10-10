import { JsonLd } from "@/components-next/json-ld";
import { medicalCondition, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { patientApiUrl } from "@/lib/api/upstream";
import { readPublicEntity } from "@/lib/api/public-read";
import { formatPrice } from "@/lib/format-price";
import { CONSULT, ActionLinks } from "@/components-next/consult/consult-parts";
import { DoctorListCard } from "@/components-next/consult/doctor-list-card";
import { CardGrid, ChipSet, EntityRow, LandingPage, LandingSection } from "@/components-next/landing/landing-kit";
import { pickText } from "@/components-next/diagnostics/diag-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";

type Props = { params: Promise<{ locale: string; slug: string }> };

type ConditionAnswer = {
  entity?: {
    name_ar?: string | null;
    name_en?: string | null;
    overview_ar?: string | null;
    overview_en?: string | null;
    symptoms?: string[] | null;
  } | null;
  relationships?: {
    doctors?: Array<{ id: string; slug?: string | null; name_ar?: string | null; name_en?: string | null; specialty?: string | null }>;
    relevant_medicines?: Array<{ id?: string; sku?: string | number; slug: string; name_ar?: string | null; name_en?: string | null; active_ingredient?: string | null; price?: number | null }>;
  } | null;
};

function getCondition(code: string) {
  return readPublicEntity<ConditionAnswer>(patientApiUrl(`/entity-graph/related/condition/${encodeURIComponent(code)}`), 3600);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await getCondition(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const name = (locale === "ar" ? data.entity.name_ar : data.entity.name_en) ?? "";
  const canonical = localizedUrl(locale as Locale, `/condition/${encodeURIComponent(slug)}`);
  const desc = (locale === "ar" ? data.entity.overview_ar : data.entity.overview_en) || "";
  return {
    title: t("meta.condition.title", { name }),
    description: desc.slice(0, 160),
    alternates: { canonical, languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/condition/${encodeURIComponent(slug)}`)] )), "x-default": localizedUrl("ar", `/condition/${encodeURIComponent(slug)}`) } },
    openGraph: { title: name, description: desc, url: canonical, type: "article" },
    robots: { index: true, follow: true },
  };
}

export default async function ConditionCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const data = await getCondition(slug);
  if (!data?.entity) notFound();
  const t = await getTranslations("PublicLanding");
  const cond = data.entity;
  const rels = data.relationships ?? {};
  const title = pickText(locale, cond.name_ar ?? undefined, cond.name_en ?? undefined) ?? "";
  const overview = pickText(locale, cond.overview_ar ?? undefined, cond.overview_en ?? undefined);
  const symptoms = cond.symptoms ?? [];
  const doctors = rels.doctors ?? [];
  const medicines = rels.relevant_medicines ?? [];

  return (
    <LandingPage locale={locale} title={title} intro={overview} backHref={`/${locale}`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO) */}
      <JsonLd data={[medicalCondition({ name: title, path: `/condition/${slug}`, locale: locale as Locale, symptoms: cond.symptoms ?? undefined, overview }), breadcrumbList([{ name: "Nabd Plus", locale: locale as Locale, path: "/" }, { name: t("ld.crumbHealthGuide"), locale: locale as Locale, path: "/health" }, { name: title, locale: locale as Locale, path: `/condition/${slug}` }])]} />

      {symptoms.length ? (
        <LandingSection id="symptoms" title={t("condition.symptoms")}>
          <ChipSet label={t("condition.symptoms")} items={symptoms} tone={CONSULT.tone} />
        </LandingSection>
      ) : null}

      {doctors.length ? (
        <LandingSection id="doctors" title={t("condition.doctors")}>
          <CardGrid label={t("condition.doctors")}>
            {doctors.map((d) => (
              <li key={d.id}>
                <DoctorListCard
                  locale={locale}
                  href={`/${locale}/doctor/${d.slug || d.id}`}
                  name={pickText(locale, d.name_ar ?? undefined, d.name_en ?? undefined) ?? ""}
                  specialty={d.specialty ?? undefined}
                  modes={[]}
                  bookLabel={t("doctorsCity.book")}
                />
              </li>
            ))}
          </CardGrid>
        </LandingSection>
      ) : null}

      {medicines.length ? (
        <LandingSection id="medicines" title={t("condition.medicines")}>
          <CardGrid label={t("condition.medicines")}>
            {medicines.map((m) => (
              <li key={m.sku ?? m.id ?? m.slug}>
                <EntityRow
                  locale={locale}
                  href={`/${locale}/p/${encodeURIComponent(m.slug)}`}
                  icon={SERVICE_ICONS.pharmacy.icon}
                  tone={SERVICE_ICONS.pharmacy.tone}
                  title={(locale === "ar" ? m.name_ar : m.name_en || m.name_ar) ?? ""}
                  sub={[m.active_ingredient, m.price ? formatPrice(locale, m.price).text : ""].filter(Boolean).join(" · ") || undefined}
                />
              </li>
            ))}
          </CardGrid>
        </LandingSection>
      ) : null}

      <ActionLinks actions={[{ href: `/${locale}/consultations`, label: t("condition.book") }]} />
    </LandingPage>
  );
}
