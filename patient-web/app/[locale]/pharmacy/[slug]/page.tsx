import { JsonLd } from "@/components-next/json-ld";
import { pharmacy, breadcrumbList } from "@/lib/seo/structured-data";
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

type Props = { params: Promise<{ locale: string; slug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchPharmacy(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/entity-graph/related/pharmacy/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      // Fallback to general provider or facility lookup
      const fallback = await fetch(`${API_BASE}/api/v1/seo/resolve/doctor/${encodeURIComponent(slug)}`);
      if (!fallback.ok) return null;
      const entity = await fallback.json();
      return { entity, relationships: {} };
    }
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

  const data = await fetchPharmacy(slug);
  if (!data?.entity) notFound();

  const ph = data.entity;
  const name = locale === "ar" ? (ph.name_ar || ph.name_en || ph.name) : (ph.name_en || ph.name_ar || ph.name);
  const path = `/pharmacy/${encodeURIComponent(slug)}`;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const jsonLd = [
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
