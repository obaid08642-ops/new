import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Award, Clock, HeartPulse, MapPin, ShieldCheck, Star } from "lucide-react";
import { getPublicNurse, extractNurse } from "@/lib/api/nursing-server";
import styles from "./nurse-detail.module.css";

type Props = { params: Promise<{ locale: string; nurseId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, nurseId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "NurseDetail" });
  const canonical = localizedUrl(locale, `/nursing/nurses/${encodeURIComponent(nurseId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/nursing/nurses/${encodeURIComponent(nurseId)}`)])),
        "x-default": localizedUrl("ar", `/nursing/nurses/${encodeURIComponent(nurseId)}`),
      },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function NurseDetailPage({ params }: Props) {
  const { locale, nurseId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("NurseDetail");
  const response = await getPublicNurse(nurseId);
  if (!response || response.status === 404) notFound();

  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <HeartPulse size={28} aria-hidden="true" />
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailableBody")}</p>
          <Link href={`/${locale}/nursing/catalog`} className={styles.action}>
            {t("retry")}
          </Link>
        </section>
      </main>
    );
  }

  const nurse = extractNurse(await response.json().catch(() => null));
  if (!nurse) notFound();

  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/nursing/catalog`} className={styles.back}>
        <Arrow size={17} aria-hidden="true" />
        {t("back")}
      </Link>

      <article className={styles.detail}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {nurse.avatar ? (
              <img src={nurse.avatar} alt={nurse.name} className={styles.avatarImg} />
            ) : (
              <HeartPulse size={40} aria-hidden="true" />
            )}
          </div>
          <div className={styles.mainInfo}>
            <div className={styles.badgeRow}>
              <span className={styles.verifiedBadge}>
                <ShieldCheck size={14} aria-hidden="true" />
                {t("verified")}
              </span>
              <span className={styles.ratingBadge}>
                <Star size={14} fill="#F59E0B" color="#F59E0B" aria-hidden="true" />
                <strong>{nurse.rating?.toFixed(1)}</strong>
              </span>
            </div>
            <h1>{locale === "ar" ? nurse.name_ar || nurse.name : nurse.name_en || nurse.name}</h1>
            <p className={styles.specialty}>{locale === "ar" ? nurse.specialty_ar || nurse.specialty : nurse.specialty_en || nurse.specialty}</p>
            {nurse.city ? (
              <p className={styles.location}>
                <MapPin size={14} aria-hidden="true" />
                <span>{nurse.city}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <Award size={20} aria-hidden="true" />
            <strong>{nurse.experience_years} {t("years")}</strong>
            <small>{t("experienceLabel")}</small>
          </div>
          <div className={styles.statCard}>
            <Star size={20} fill="#F59E0B" color="#F59E0B" aria-hidden="true" />
            <strong>{nurse.rating?.toFixed(1)}</strong>
            <small>{t("ratingLabel")}</small>
          </div>
          <div className={styles.statCard}>
            <Clock size={20} aria-hidden="true" />
            <strong>24/7</strong>
            <small>{t("homeCareLabel")}</small>
          </div>
        </div>

        <section className={styles.section}>
          <h2>{t("aboutTitle")}</h2>
          <p className={styles.aboutText}>{nurse.bio || t("defaultBio")}</p>
        </section>

        {nurse.services && nurse.services.length > 0 ? (
          <section className={styles.section}>
            <h2>{t("servicesTitle")}</h2>
            <div className={styles.serviceList}>
              {nurse.services.map((svc) => (
                <div key={svc.id} className={styles.serviceItem}>
                  <div>
                    <strong>{locale === "ar" ? svc.name_ar || svc.name : svc.name_en || svc.name}</strong>
                    {svc.duration ? <small>{svc.duration}</small> : null}
                  </div>
                  {svc.price !== undefined ? (
                    <span className={styles.price}>{t("price", { value: svc.price })}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className={styles.actionRow}>
          <Link href={`/${locale}/nursing/catalog`} className={styles.bookButton}>
            {t("requestNurse")}
          </Link>
        </div>
      </article>
    </main>
  );
}
