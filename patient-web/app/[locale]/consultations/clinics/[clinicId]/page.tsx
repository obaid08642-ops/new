import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicClinic, extractClinic } from "@/lib/api/clinics-server";
import { formatNumber } from "@/lib/format-price";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ProfileHeader, type ProfileStat } from "@/components-next/consult/profile-header";
import { ActionLinks, Facts, RowCard, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; clinicId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, clinicId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Clinics" });
  const canonical = localizedUrl(locale, `/consultations/clinics/${encodeURIComponent(clinicId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/consultations/clinics/${encodeURIComponent(clinicId)}`)])),
        "x-default": localizedUrl("ar", `/consultations/clinics/${encodeURIComponent(clinicId)}`),
      },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function ClinicDetailPage({ params }: Props) {
  const { locale, clinicId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("Clinics");
  const c = await getTranslations("ConsultWeb");
  const response = await getPublicClinic(clinicId);
  if (!response || response.status === 404) notFound();
  const back = `/${locale}/consultations/doctors`;

  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }

  const clinic = extractClinic(await response.json().catch(() => null));
  if (!clinic) notFound();

  const rtl = locale === "ar" || locale === "ur";
  const about = locale === "ar" ? clinic.description_ar || clinic.description : clinic.description_en || clinic.description;
  const place = clinic.city || clinic.address;
  const stats: ProfileStat[] = clinic.rating !== undefined ? [{ value: formatNumber(locale, clinic.rating), label: c("statRating") }] : [];
  const rows: FactRow[] = [];
  if (place) rows.push({ label: c("locationLabel"), value: place, icon: "map-pin", tone: SERVICE_ICONS.map.tone });

  return (
    <ConsultPage locale={locale} title={clinic.name} backHref={back}>
      {clinic.image ? <img src={clinic.image} alt={clinic.name} className={styles.cover} /> : <div className={`${styles.cover} ${styles.coverEmpty}`}><FIcon icon="hospital" tone="blue" size={88} /></div>}
      <ProfileHeader icon="hospital" tone="blue" line={t("typeLabel")} stats={stats} />
      {rows.length > 0 || clinic.phone ? (
        <SectionCard id="clinic-contact">
          {rows.length > 0 ? <Facts rows={rows} /> : null}
          <ActionLinks actions={clinic.phone ? [{ href: `tel:${clinic.phone}`, label: clinic.phone, variant: "outline", external: true }] : []} />
        </SectionCard>
      ) : null}
      {about ? (
        <SectionCard id="clinic-about" title={t("aboutTitle")}>
          <p className={styles.body}>{about}</p>
        </SectionCard>
      ) : null}
      {clinic.doctors && clinic.doctors.length > 0 ? (
        <SectionCard id="clinic-doctors" title={t("doctorsTitle")}>
          <ul className={styles.list}>
            {clinic.doctors.map((doc) => (
              <li key={doc.id}>
                <RowCard
                  href={`/${locale}/consultations/doctors/${doc.id}`}
                  title={(locale === "ar" ? doc.name_ar || doc.name : doc.name || doc.name_ar) ?? ""}
                  sub={locale === "ar" ? doc.specialty_ar || doc.specialty : doc.specialty || doc.specialty_ar}
                  caret={<Icon name={rtl ? "caret-left" : "caret-right"} size={20} tone="currentColor" />}
                />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </ConsultPage>
  );
}
