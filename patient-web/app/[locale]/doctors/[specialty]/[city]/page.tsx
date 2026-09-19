import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, physician } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Building2, MapPin, Star } from "lucide-react";
import styles from "./doctors-city.module.css";

type Props = { params: Promise<{ locale: string; specialty: string; city: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchDoctorsByLocation(specialty: string, city: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/entity-graph/explore?specialty=${encodeURIComponent(specialty)}&city=${encodeURIComponent(city)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, specialty, city } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctorsByLocation(specialty, city);

  // If no providers or facilities exist, do not index thin page
  if (!data || (data.total_doctors === 0 && data.total_facilities === 0)) {
    return { robots: { index: false, follow: false } };
  }

  const canonical = localizedUrl(locale as Locale, `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`);
  const title = locale === "ar"
    ? `أطباء ${specialty} في ${city} | احجز موعدك الآن`
    : `${specialty} Doctors in ${city} | Book Appointment`;
  const desc = locale === "ar"
    ? `قائمة الأطباء المعتمدين لتخصص ${specialty} في ${city}. احجز استشارتك مع نخبة من الأطباء والمراكز المعتمدة عبر نبضة بلس.`
    : `Verified ${specialty} doctors and clinics in ${city}. Book in-clinic or online consultation via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`)])),
        "x-default": localizedUrl("ar", `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorsSpecialtyCityPage({ params }: Props) {
  const { locale, specialty, city } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchDoctorsByLocation(specialty, city);
  // Anti-thin doorway page rule: must have at least one doctor or facility
  if (!data || (data.total_doctors === 0 && data.total_facilities === 0)) {
    notFound();
  }

  const doctors = data.doctors || [];
  const facilities = data.facilities || [];

  const pageTitle = locale === "ar"
    ? `أطباء ${specialty} في ${city}`
    : `${specialty} Doctors in ${city}`;

  return (
    <main className={`main ${styles.page}`}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/doctors/${specialty}/${city}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: specialty, locale: locale as Locale, path: `/consultations/specialties` },
            { name: city, locale: locale as Locale, path: `/doctors/${specialty}/${city}` },
          ]),
        ]}
      />

      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{specialty}</p>
          <h1>{pageTitle}</h1>
          <p className={styles.subtitle}>
            {locale === "ar"
              ? `استعرض الأطباء والمراكز الطبية المعتمدة في ${city} مع تقييمات موثقة وأسعار شفافة.`
              : `Browse verified doctors and clinics in ${city} with verified reviews and transparent pricing.`}
          </p>
        </div>
        <span className={styles.vectorWrap} aria-hidden="true">
          <VectorDoctor size={48} />
        </span>
      </section>

      {doctors.length ? (
        <section className={styles.section} aria-label={locale === "ar" ? "الأطباء المتاحون" : "Available Doctors"}>
          <h2 className={styles.sectionHead}>
            <VectorDoctor size={20} aria-hidden="true" />
            {locale === "ar" ? "الأطباء المتاحون" : "Available Doctors"}
          </h2>
          <div className={styles.grid}>
            {doctors.map((doc: any) => (
              <div key={doc.id} className={styles.card}>
                <h3 className={styles.cardTitle}>
                  <Link href={`/${locale}/doctor/${doc.slug || doc.id}`}>
                    {locale === "ar" ? (doc.name_ar || doc.name_en) : (doc.name_en || doc.name_ar)}
                  </Link>
                </h3>
                <p className={styles.meta} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{doc.specialty}</p>
                {doc.rating ? (
                  <span className={styles.rating}>
                    <Star size={14} fill="#eab308" color="#b45309" aria-hidden="true" />
                    {doc.rating}
                  </span>
                ) : null}
                <Link href={`/${locale}/consultations/doctors/${doc.id || doc.slug}`} className={styles.primaryBtn} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: "20px", border: "1px solid #E8EDEE" } as any}>
                  {locale === "ar" ? "حجز موعد" : "Book Appointment"}
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {facilities.length ? (
        <section className={styles.section} aria-label={locale === "ar" ? "المستشفيات والمراكز التابعة" : "Associated Hospitals & Clinics"}>
          <h2 className={styles.sectionHead}>
            <Building2 size={18} aria-hidden="true" />
            {locale === "ar" ? "المستشفيات والمراكز التابعة" : "Associated Hospitals & Clinics"}
          </h2>
          <div className={styles.grid}>
            {facilities.map((fac: any) => (
              <div key={fac.id} className={styles.card}>
                <h3 className={styles.cardTitle}>
                  <Link href={`/${locale}/facility/${fac.slug || fac.id}`}>
                    {locale === "ar" ? (fac.name_ar || fac.name_en) : (fac.name_en || fac.name_ar)}
                  </Link>
                </h3>
                <p className={styles.facilityMeta}>
                  <MapPin size={14} aria-hidden="true" />
                  <span>
                    {fac.city} {fac.district ? `- ${fac.district}` : ""}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
