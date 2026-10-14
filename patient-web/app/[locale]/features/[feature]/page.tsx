import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components-next/json-ld";
import { ActionLinks, Notice } from "@/components-next/consult/consult-parts";
import { CardGrid, EntityRow, FaqList, LandingPage, LandingSection } from "@/components-next/landing/landing-kit";
import rx from "@/components-next/pharmacy/rx.module.css";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";
import { faqJsonLd } from "@/lib/seo/json-ld";
import { breadcrumbList, medicalWebPage, service } from "@/lib/seo/structured-data";
import { FEATURE_PAGES, findFeature, numbered } from "@/lib/seo/feature-pages";

type Props = { params: Promise<{ locale: string; feature: string }> };

/** The class of the direct answer under the h1 (AEO): the JSON-LD `speakable` points at it. */
const DIRECT_ANSWER = "nabd-direct-answer";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => FEATURE_PAGES.map((feature) => ({ locale, feature: feature.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, feature: slug } = await params;
  const feature = findFeature(slug);
  if (!isLocale(locale) || !feature) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "FeaturePages" });
  return hubMetadata(locale, `/features/${feature.slug}`, t(`${feature.key}.metaTitle`), t(`${feature.key}.metaDescription`));
}

/**
 * A public feature page (owner 2026-10-12, SEO/GEO/AEO): what one Nabd Plus feature does today, in the reader's language,
 * built on the public landing kit. The h1, a direct answer, what you can do, the questions and answers, and the way into the
 * signed-in screen. Static: the text comes from the message files only, no backend read, no cookie.
 */
export default async function FeaturePageRoute({ params }: Props) {
  const { locale, feature: slug } = await params;
  const feature = findFeature(slug);
  if (!isLocale(locale) || !feature) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "FeaturePages" });
  const site = await getTranslations({ locale, namespace: "Metadata" });
  const k = feature.key;
  const path = `/features/${feature.slug}`;
  const title = t(`${k}.title`);
  const answer = t(`${k}.answer`);
  const points = numbered(feature.points).map((n) => ({ title: t(`${k}.p${n}Title`), body: t(`${k}.p${n}Body`) }));
  const faq = numbered(feature.faq).map((n) => ({ q: t(`${k}.q${n}`), a: t(`${k}.a${n}`) }));
  const actions = [
    { href: `/${locale}${feature.cta}`, label: t(`${k}.cta`), variant: "primary" as const },
    ...(feature.secondary ? [{ href: `/${locale}${feature.secondary.href}`, label: t(`${k}.${feature.secondary.labelKey}`), variant: "outline" as const }] : []),
  ];
  const brand = site("siteTitle");
  const loc = locale as Locale;

  const structured = [
    medicalWebPage({ title, description: t(`${k}.metaDescription`), locale: loc, path, about: title, speakableSelectors: [`.${DIRECT_ANSWER}`] }),
    breadcrumbList([{ name: brand, locale: loc, path: "" }, { name: title, locale: loc, path }]),
    faqJsonLd(faq),
    // i18n-ok: schema.org values are kept in English as the vocabulary expects (serviceType, areaServed, the brand)
    ...(feature.service ? [service({ name: title, path, locale: loc, provider: "Nabd Plus", description: t(`${k}.metaDescription`), serviceType: "Online medical consultation", areaServed: "Saudi Arabia" })] : []),
  ];

  return (
    <LandingPage locale={locale} title={title} backHref={`/${locale}`}>
      <JsonLd data={structured} />
      <p className={`${rx.lead} ${DIRECT_ANSWER}`}>{answer}</p>
      <LandingSection id="feature-points" title={t("common.pointsTitle")}>
        <CardGrid label={t("common.pointsTitle")}>
          {points.map((point) => (
            <li key={point.title}>
              <EntityRow locale={locale} icon={feature.icon} tone={feature.tone} title={point.title} sub={point.body} />
            </li>
          ))}
        </CardGrid>
      </LandingSection>
      <LandingSection id="feature-faq" title={t("common.faqTitle")}>
        <FaqList label={t("common.faqTitle")} items={faq} />
      </LandingSection>
      <Notice>{t("common.signInNote")}</Notice>
      <ActionLinks actions={actions} />
    </LandingPage>
  );
}
