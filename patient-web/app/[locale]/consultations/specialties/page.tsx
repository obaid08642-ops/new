import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractSpecialties } from "@/lib/api/specialties";
import { getPublicSpecialties } from "@/lib/api/specialties-server";
import { isLocale } from "@/lib/i18n";
import { JsonLd } from "@/components-next/json-ld";
import { hubMetadata } from "@/lib/seo";
import { SERVICE_TONES, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard, SectionCard } from "@/components-next/consult/consult-parts";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };

const TONES: ServiceTone[] = [SERVICE_TONES[0], SERVICE_TONES[1], SERVICE_TONES[2], SERVICE_TONES[3], SERVICE_TONES[4], SERVICE_TONES[5]];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/consultations/specialties", t("consultations/specialties.title"), t("consultations/specialties.description"));
}

/** The specialties (canvas/Consult): a search field and one row per specialty, each going to the doctors of that specialty. */
export default async function SpecialtySelectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Specialties");
  const c = await getTranslations("ConsultWeb");
  const response = await getPublicSpecialties();
  const rtl = locale === "ar" || locale === "ur";

  if (!response || !response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations`}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }

  const specialties = extractSpecialties(await response.json().catch(() => null));
  const query = q.trim().toLocaleLowerCase(locale);
  const filtered = specialties.filter((specialty) => [specialty.nameAr, specialty.nameEn, specialty.slug].filter(Boolean).some((value) => value!.toLocaleLowerCase(locale).includes(query)));
  // F82-1: the catalogues are precompiled, which does not allow arrays, so the FAQ is a keyed object.
  // (t.raw throws on precompiled messages, which made this page fail whenever the specialties loaded: the keys are read with t.has.)
  const faqs: Array<{ q: string; a: string }> = [];
  for (let i = 0; t.has(`faq.${i}.q`); i += 1) faqs.push({ q: t(`faq.${i}.q`), a: t(`faq.${i}.a`) });

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations`}>
      <JsonLd data={[{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]} />
      <form method="get" role="search" className={styles.search}>
        <label className={styles.searchField}>
          <Icon name="search" size={20} tone="secondary" />
          <span className="sr-only">{t("searchLabel")}</span>
          <input id="specialty-search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={styles.searchInput} />
        </label>
        <Button type="submit" label={c("search")} size="lg" />
      </form>

      {filtered.length === 0 ? (
        <ConsultState kind="empty" icon="magnifying-glass" title={t("emptyTitle")} body={specialties.length === 0 ? t("emptyBody") : t("noMatch")} />
      ) : (
        <ul className={styles.list} aria-label={t("title")}>
          {filtered.map((specialty, index) => {
            const name = rtl ? specialty.nameAr ?? specialty.nameEn : specialty.nameEn ?? specialty.nameAr;
            return (
              <li key={specialty.slug ?? `${name}-${index}`}>
                <RowCard
                  href={`/${locale}/consultations/doctors?specialty=${encodeURIComponent(specialty.nameAr ?? specialty.nameEn ?? "")}`}
                  tone={TONES[index % TONES.length]}
                  title={name ?? ""}
                  sub={specialty.count !== undefined ? t("doctorCount", { count: specialty.count }) : undefined}
                  caret={<Icon name={rtl ? "caret-left" : "caret-right"} size={20} tone="currentColor" />}
                />
              </li>
            );
          })}
        </ul>
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
