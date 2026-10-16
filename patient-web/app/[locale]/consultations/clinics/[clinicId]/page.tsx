import { optimizedImageSrc } from "@/lib/media/optimized-image";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicClinic, extractClinic } from "@/lib/api/clinics-server";
import { formatNumber } from "@/lib/format-price";
import { Icon } from "@/components-next/ui-generated/src/Icon";
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
  // The facility's one public page is /facility/{slug}: the canonical points there and this screen
  // (doctors and booking at the clinic) is not indexed on its own.
  const response = await getPublicClinic(clinicId).catch(() => null);
  const raw = response && response.ok ? await response.json().catch(() => null) : null;
  const clinic = extractClinic(raw);
  if (!clinic) return { robots: { index: false, follow: false } };
  const record = ((raw as { data?: unknown } | null)?.data ?? raw) as { slug?: unknown; name_en?: unknown } | null;
  const key = typeof record?.slug === "string" && record.slug ? record.slug : clinic.id;
  const facilityPath = `/facility/${encodeURIComponent(key)}`;
  const name = (locale !== "ar" && typeof record?.name_en === "string" && record.name_en) || clinic.name || t("title");
  return {
    title: `${name} | ${t("title")}`,
    description: t("subtitle"),
    alternates: {
      canonical: localizedUrl(locale, facilityPath),
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, facilityPath)])),
        "x-default": localizedUrl("ar", facilityPath),
      },
    },
    openGraph: { type: "website", url: localizedUrl(locale, facilityPath), title: name },
    robots: { index: false, follow: true },
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
      {clinic.image ? <img src={optimizedImageSrc(clinic.image, 414)} alt={clinic.name} className={styles.cover} decoding="async" /> : null}
      <ProfileHeader icon="hospital" tone="blue" line={t("typeLabel")} stats={stats} />
      {rows.length > 0 || clinic.phone ? (
        <SectionCard id="clinic-contact">
          {rows.length > 0 ? <Facts rows={rows} /> : null}
          <ActionLinks actions={clinic.phone ? [{ href: `tel:${clinic.phone}`, label: `\u2066${clinic.phone}\u2069`, variant: "outline", external: true }] : []} />
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
