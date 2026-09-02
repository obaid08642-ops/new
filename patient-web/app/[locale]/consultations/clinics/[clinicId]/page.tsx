import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Building2, MapPin, Phone, Star, Stethoscope } from "lucide-react";
import { getPublicClinic, extractClinic } from "@/lib/api/clinics-server";
import styles from "./clinic.module.css";

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
  const response = await getPublicClinic(clinicId);
  if (!response || response.status === 404) notFound();

  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <Building2 size={28} aria-hidden="true" />
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailableBody")}</p>
          <Link href={`/${locale}/consultations/doctors`} className={styles.action}>
            {t("retry")}
          </Link>
        </section>
      </main>
    );
  }

  const clinic = extractClinic(await response.json().catch(() => null));
  if (!clinic) notFound();

  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/consultations/doctors`} className={styles.back}>
        <Arrow size={17} aria-hidden="true" />
        {t("back")}
      </Link>

      <article className={styles.detail}>
        <div className={styles.heroBanner}>
          {clinic.image ? (
            <img src={clinic.image} alt={clinic.name} className={styles.coverImage} />
          ) : (
            <div className={styles.placeholderBanner}>
              <Building2 size={48} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className={styles.header}>
          <div className={styles.badge}>{t("typeLabel")}</div>
          <div className={styles.rating}>
            <Star size={16} fill="#F59E0B" color="#F59E0B" aria-hidden="true" />
            <strong>{clinic.rating?.toFixed(1)}</strong>
          </div>
        </div>

        <h1>{clinic.name}</h1>

        {clinic.city || clinic.address ? (
          <p className={styles.location}>
            <MapPin size={16} aria-hidden="true" />
            <span>{clinic.city || clinic.address}</span>
          </p>
        ) : null}

        {clinic.phone ? (
          <p className={styles.contact}>
            <Phone size={16} aria-hidden="true" />
            <a href={`tel:${clinic.phone}`}>{clinic.phone}</a>
          </p>
        ) : null}

        <section className={styles.section}>
          <h2>{t("aboutTitle")}</h2>
          <p className={styles.aboutText}>
            {locale === "ar" ? clinic.description_ar || clinic.description : clinic.description_en || clinic.description || t("defaultAbout")}
          </p>
        </section>

        {clinic.doctors && clinic.doctors.length > 0 ? (
          <section className={styles.section}>
            <h2>{t("doctorsTitle")}</h2>
            <div className={styles.doctorGrid}>
              {clinic.doctors.map((doc) => (
                <Link key={doc.id} href={`/${locale}/consultations/doctors/${doc.id}`} className={styles.doctorCard}>
                  <div className={styles.avatar}>
                    <Stethoscope size={24} aria-hidden="true" />
                  </div>
                  <div className={styles.doctorInfo}>
                    <strong>{locale === "ar" ? doc.name_ar || doc.name : doc.name || doc.name_ar}</strong>
                    <small>{locale === "ar" ? doc.specialty_ar || doc.specialty : doc.specialty || doc.specialty_ar}</small>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
