import { SuggestInput } from "@/components-next/search/suggest-input";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractSpecialties } from "@/lib/api/specialties";
import { getPublicSpecialties } from "@/lib/api/specialties-server";
import { isLocale } from "@/lib/i18n";
import { specialtyLabel } from "@/lib/specialties";
import { JsonLd } from "@/components-next/json-ld";
import { hubMetadata } from "@/lib/seo";
import { filterSpecialties, orderSpecialties } from "@/components-next/ui-generated/icons/specialty-art";
import { SpecialtyGrid } from "@/components-next/consult/specialty-tiles";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { SectionCard } from "@/components-next/consult/consult-parts";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/consultations/specialties", t("consultations/specialties.title"), t("consultations/specialties.description"));
}

/** All specialties: a search field and a grid of illustrated tiles (those with doctors first, the rest "Coming soon"), each going to the doctors of that specialty. */
export default async function SpecialtySelectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Specialties");
  const c = await getTranslations("ConsultWeb");
  const names = await getTranslations("SpecialtyNames");
  const response = await getPublicSpecialties();
  const rtl = locale === "ar" || locale === "ur";

  if (!response || !response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations`} appointmentsHref={`/${locale}/appointments`}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }

  const specialties = extractSpecialties(await response.json().catch(() => null));
  // the name in the page's language is the message for the slug (six languages); the server's Arabic/English text is the fallback for a slug this build does not list
  const nameOf = (specialty: { slug?: string; nameAr?: string; nameEn?: string }) => specialtyLabel(names, specialty.slug) ?? (rtl ? specialty.nameAr ?? specialty.nameEn : specialty.nameEn ?? specialty.nameAr) ?? "";
  const tiles = orderSpecialties(specialties, nameOf);
  // search: the name in the page's language, the Arabic and the English name
  const serverNames = Object.fromEntries(specialties.flatMap((specialty) => (specialty.slug ? [[specialty.slug, { nameAr: specialty.nameAr, nameEn: specialty.nameEn }]] : [])));
  const filtered = filterSpecialties(tiles, q, serverNames);
  // F82-1: the catalogues are precompiled, which does not allow arrays, so the FAQ is a keyed object.
  // (t.raw throws on precompiled messages, which made this page fail whenever the specialties loaded: the keys are read with t.has.)
  const faqs: Array<{ q: string; a: string }> = [];
  for (let i = 0; t.has(`faq.${i}.q`); i += 1) faqs.push({ q: t(`faq.${i}.q`), a: t(`faq.${i}.a`) });

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations`} appointmentsHref={`/${locale}/appointments`}>
      <JsonLd data={[{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]} />
      <form method="get" role="search" className={styles.search}>
        <SuggestInput locale={locale} id="specialty-search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} label={t("searchLabel")} fieldClassName={styles.searchField} inputClassName={styles.searchInput}>
          <Icon name="search" size={20} tone="secondary" />
        </SuggestInput>
        <Button type="submit" label={c("search")} size="lg" />
      </form>

      {filtered.length === 0 ? (
        <ConsultState kind="empty" icon="magnifying-glass" title={t("emptyTitle")} body={specialties.length === 0 ? t("emptyBody") : t("noMatch")} />
      ) : (
        <SpecialtyGrid label={t("title")} comingSoonLabel={t("comingSoon")} tiles={filtered} hrefOf={(slug) => `/${locale}/consultations/doctors?specialty=${encodeURIComponent(slug)}`} />
      )}

      <SectionCard id="specialties-faq" title={t("faqTitle")}>
        <div>
          {faqs.map((f, i) => (
            <details key={i} className={styles.faq}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </SectionCard>
    </ConsultPage>
  );
}
