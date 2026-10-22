import { JsonLd } from "@/components-next/json-ld";
import { patientApiUrl } from "@/lib/api/upstream";
import { PROVIDER_PAGES_TAG } from "@/lib/api/doctors-server";
import { pharmacy, breadcrumbList, medicalWebPage } from "@/lib/seo/structured-data";
import { DirectAnswer } from "@/components-next/seo/direct-answer";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { Card } from "@/components-next/ui-generated/components/Surfaces";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import styles from "@/components-next/pharmacy/pharmacy.module.css";
import { publicReadSignal } from "@/lib/api/public-timeout";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function fetchPharmacy(slug: string) {
  try {
    // issue 473: the same server base as every other server fetch (patientApiUrl); appending /api/v1 to a public base
    // that already ends in it made every pharmacy page a 404.
    const res = await fetch(patientApiUrl(`/entity-graph/related/pharmacy/${encodeURIComponent(slug)}`), { signal: publicReadSignal(),
      // issue 1541: purged with the provider pages when the pharmacy is deleted
      next: { revalidate: 3600, tags: [PROVIDER_PAGES_TAG] },
    });
    // The backend resolves the reviewed pharmacy profile; anything else is a 404 (the old fallback
    // to the doctor resolver could draw a doctor as a pharmacy).
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchPharmacy(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const ph = data.entity;
  const name = locale === "ar" ? (ph.name_ar || ph.name_en || ph.name) : (ph.name_en || ph.name_ar || ph.name);
  const canonical = localizedUrl(locale as Locale, `/pharmacy/${encodeURIComponent(slug)}`);
  const t = await getTranslations({ locale, namespace: "PharmacyBrowse" });
  const city = typeof ph.city === "string" && ph.city.trim() ? ph.city.trim() : null;
  const desc = city ? t("pharmacyMetaDescriptionCity", { name, city }) : t("pharmacyMetaDescription", { name });

  return {
    title: t("pharmacyMetaTitle", { name }),
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/pharmacy/${encodeURIComponent(slug)}`)])),
        "x-default": localizedUrl("ar", `/pharmacy/${encodeURIComponent(slug)}`),
      },
    },
    openGraph: { title: name, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function PharmacyCanonicalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("PharmacyBrowse");
  const shared = await getTranslations("Shared");
  const seo = await getTranslations("SeoAnswer");

  const data = await fetchPharmacy(slug);
  if (!data?.entity) notFound();

  const ph = data.entity;
  const name = locale === "ar" ? (ph.name_ar || ph.name_en || ph.name) : (ph.name_en || ph.name_ar || ph.name);
  const path = `/pharmacy/${encodeURIComponent(slug)}`;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const jsonLd = [
    medicalWebPage({ title: name, locale: locale as Locale, path, speakable: true }),
    pharmacy({
      name,
      path,
      locale: locale as Locale,
      // no invented city: the entity's own, or none
      city: text(ph.city),
    }),
    breadcrumbList([
      { name: shared("navHome"), locale: locale as Locale, path: "" },
      { name: t("pharmaciesCrumb"), locale: locale as Locale, path: "/pharmacies" },
      { name, locale: locale as Locale, path },
    ]),
  ];

  // Only what the API sent: no default hours, delivery time or license is drawn for a pharmacy that has none.
  const facts: Array<{ icon: FillIconName; tone: ServiceTone; label: string; value: string }> = [];
  const place = [text(ph.city), text(ph.district)].filter(Boolean).join(" · ");
  if (place) facts.push({ icon: "map-pin", tone: "amber", label: t("pharmacyLocation"), value: place });
  const delivery = text(ph.estimated_delivery_time);
  if (delivery) facts.push({ icon: "moped", tone: "peach", label: t("pharmacyDelivery"), value: delivery });
  const license = text(ph.sfda_license_number) || text(ph.license_number);
  if (license) facts.push({ icon: "shield-check", tone: "blue", label: t("pharmacyLicense"), value: license });
  const rxHref = ph.id ? `/${locale}/pharmacy/rx-order?via=photo&pharmacyId=${encodeURIComponent(String(ph.id))}` : `/${locale}/pharmacy/rx-order?via=photo`;

  return (
    <CoreShell locale={locale as Locale} title={name} backHref={`/${locale}/pharmacies`} width="narrow">
      <JsonLd data={jsonLd} />
      <div className={styles.page}>
        <div className={styles.pharmacyHead}>
          <FIcon icon="pill" tone={PHARMACY_TONE} size={56} />
          <h1 className={styles.pharmacyName}>{name}</h1>
        </div>
        <DirectAnswer sentences={[
          text(ph.city) ? seo("pharmacyWho", { name, city: text(ph.city) as string }) : seo("pharmacyWhoNoCity", { name }),
          seo("pharmacyHow"),
        ]} />
        {facts.length ? (
          <Card elevation="card" padding="md">
            <dl className={styles.facts}>
              {facts.map((fact) => (
                <div key={fact.label} className={styles.fact}>
                  <FIcon icon={fact.icon} tone={fact.tone} size={40} />
                  <div className={styles.factBody}>
                    <dt className={styles.factLabel}>{fact.label}</dt>
                    <dd className={styles.factValue}>{fact.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>
        ) : null}
        <Link href={rxHref} className={`nabd-button nabd-button--primary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
          <span className="nabd-button__label">{t("pharmacyUpload")}</span>
        </Link>
      </div>
    </CoreShell>
  );
}
