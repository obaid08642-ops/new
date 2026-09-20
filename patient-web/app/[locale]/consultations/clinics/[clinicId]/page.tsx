import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, MapPin, Phone, Star, Stethoscope } from "lucide-react";
import { getPublicClinic, extractClinic } from "@/lib/api/clinics-server";
import { VectorMap } from "@/components-next/vector-illustrations";
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
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
        <section className={styles.state} role="alert" style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16 } as any}>
          <VectorMap size={48} aria-hidden="true" />
          <h1 style={{ color: "#1E332E", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", overflowWrap: "anywhere" }}>{t("unavailableTitle")}</h1>
          <p style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", overflowWrap: "anywhere" }}>{t("unavailableBody")}</p>
          <Link href={`/${locale}/consultations/doctors`} className={styles.action} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760 } as any}>
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
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <Link href={`/${locale}/consultations/doctors`} className={styles.back} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", gap: 8 } as any}>
        <Arrow size={17} aria-hidden="true" />
        {t("back")}
      </Link>

      <article className={styles.detail} style={{ gap: 16, borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div className={styles.heroBanner} style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #E8EDEE" } as any}>
          {clinic.image ? (
            <img src={clinic.image} alt={clinic.name} className={styles.coverImage} />
          ) : (
            <div className={styles.placeholderBanner} style={{ borderRadius: 20 } as any}>
              <VectorMap size={48} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className={styles.header} style={{ gap: 8 } as any}>
          <div className={styles.badge} style={{ borderRadius: 20, border: "1px solid #E8EDEE", color: "#1E332E" } as any}>{t("typeLabel")}</div>
          <div className={styles.rating}>
            <Star size={16} fill="#F59E0B" color="#F59E0B" aria-hidden="true" />
            <strong>{clinic.rating?.toFixed(1)}</strong>
          </div>
        </div>

        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{clinic.name}</h1>

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

        <section className={styles.section} style={{ gap: 8 } as any}>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("aboutTitle")}</h2>
          <p className={styles.aboutText} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {locale === "ar" ? clinic.description_ar || clinic.description : clinic.description_en || clinic.description || t("defaultAbout")}
          </p>
        </section>

        {clinic.doctors && clinic.doctors.length > 0 ? (
          <section className={styles.section} style={{ gap: 16 } as any}>
            <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("doctorsTitle")}</h2>
            <div className={styles.doctorGrid} style={{ gap: 16 } as any}>
              {clinic.doctors.map((doc) => (
                <Link key={doc.id} href={`/${locale}/consultations/doctors/${doc.id}`} className={styles.doctorCard} style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 8 } as any}>
                  <div className={styles.avatar} style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.14)", border: "1px solid #E8EDEE", color: "#1E332E" } as any}>
                    <Stethoscope size={24} aria-hidden="true" />
                  </div>
                  <div className={styles.doctorInfo} style={{ gap: 8 } as any}>
                    <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{locale === "ar" ? doc.name_ar || doc.name : doc.name || doc.name_ar}</strong>
                    <small style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{locale === "ar" ? doc.specialty_ar || doc.specialty : doc.specialty || doc.specialty_ar}</small>
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
