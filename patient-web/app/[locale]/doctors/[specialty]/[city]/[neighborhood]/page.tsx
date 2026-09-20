import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, physician } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Building2, MapPin, ShieldCheck, Star } from "lucide-react";
import styles from "./doctors-neighborhood.module.css";

type Props = { params: Promise<{ locale: string; specialty: string; city: string; neighborhood: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchDoctorsByNeighborhood(specialty: string, city: string, neighborhood: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/entity-graph/explore?specialty=${encodeURIComponent(specialty)}&city=${encodeURIComponent(city)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    // Filter facilities and doctors in or near the neighborhood
    const normNeigh = decodeURIComponent(neighborhood).toLowerCase();
    const filteredFacs = (json.facilities || []).filter((f: any) =>
      (f.district && f.district.toLowerCase().includes(normNeigh)) ||
      (f.address && f.address.toLowerCase().includes(normNeigh))
    );
    return {
      ...json,
      facilities: filteredFacs.length ? filteredFacs : json.facilities,
      neighborhood: decodeURIComponent(neighborhood),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, specialty, city, neighborhood } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctorsByNeighborhood(specialty, city, neighborhood);

  if (!data || (data.total_doctors === 0 && data.facilities?.length === 0)) {
    return { robots: { index: false, follow: false } };
  }

  const decSpec = decodeURIComponent(specialty);
  const decCity = decodeURIComponent(city);
  const decNeigh = decodeURIComponent(neighborhood);

  const canonical = localizedUrl(
    locale as Locale,
    `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
  );
  const title = locale === "ar"
    ? `أطباء ${decSpec} في حي ${decNeigh}، ${decCity} | احجز الآن`
    : `${decSpec} Doctors in ${decNeigh}, ${decCity} | Book Appointment`;
  const desc = locale === "ar"
    ? `أفضل أطباء ${decSpec} والمراكز الطبية المعتمدة في حي ${decNeigh} بمدينة ${decCity}. استشارات عيادية وتطبيب عن بعد مع نبضة بلس.`
    : `Verified ${decSpec} doctors in ${decNeigh}, ${decCity}. Book consultations via Nabd Plus.`;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(
              l,
              `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
            ),
          ]),
        ),
        "x-default": localizedUrl(
          "ar",
          `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
        ),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorsSpecialtyCityNeighborhoodPage({ params }: Props) {
  const { locale, specialty, city, neighborhood } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchDoctorsByNeighborhood(specialty, city, neighborhood);
  if (!data || (data.total_doctors === 0 && data.facilities?.length === 0)) {
    notFound();
  }

  const doctors = data.doctors || [];
  const facilities = data.facilities || [];
  const decSpec = decodeURIComponent(specialty);
  const decCity = decodeURIComponent(city);
  const decNeigh = decodeURIComponent(neighborhood);

  const pageTitle = locale === "ar"
    ? `أطباء ${decSpec} في حي ${decNeigh}، ${decCity}`
    : `${decSpec} Doctors in ${decNeigh}, ${decCity}`;

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/doctors/${specialty}/${city}/${neighborhood}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: decSpec, locale: locale as Locale, path: `/consultations/specialties` },
            { name: decCity, locale: locale as Locale, path: `/doctors/${specialty}/${city}` },
            { name: decNeigh, locale: locale as Locale, path: `/doctors/${specialty}/${city}/${neighborhood}` },
          ]),
        ]}
      />

      <section className={styles.header} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}>{decSpec}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{pageTitle}</h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {locale === "ar"
              ? `استعرض الأطباء والعيادات المعتمدة في حي ${decNeigh} بمدينة ${decCity} مع مواعيد فورية وتغطية تأمينية.`
              : `Verified healthcare professionals and clinics in ${decNeigh}, ${decCity} with instant booking.`}
          </p>
        </div>
        <span className={styles.vectorWrap} aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}>
          <VectorDoctor size={48} />
        </span>
      </section>

      {doctors.length > 0 && (
        <section className={styles.section} aria-label={locale === "ar" ? "الأطباء المعتمدون" : "Verified Doctors"} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <h2 className={styles.sectionHead} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}>
            <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorDoctor size={48} aria-hidden="true" /></span>
            <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{locale === "ar" ? "الأطباء المعتمدون" : "Verified Doctors"}</span>
          </h2>
          <div className={styles.grid} style={{ gap: 16 } as any}>
            {doctors.map((doc: any) => (
              <article key={doc.id} className={styles.card} style={{ gap: 8, padding: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.72)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
                <h3 className={styles.cardTitle} style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{doc.name_ar || doc.name_en || doc.name}</h3>
                <p className={styles.facilityMeta} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{doc.specialty}</p>
                <span className={styles.rating} style={{ overflowWrap: "anywhere" } as any}>
                  <Star size={14} fill="#d97706" color="#b45309" aria-hidden="true" />
                  {doc.rating || 4.9}
                </span>
                <Link href={`/${locale}/consultations/book/${doc.id}`} className={styles.primaryBtn} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere" } as any}>
                  {locale === "ar" ? "احجز استشارة" : "Book Consultation"}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {facilities.length > 0 && (
        <section className={styles.section} aria-label={locale === "ar" ? "المراكز والمستشفيات في الحي والمنطقة" : "Clinics & Hospitals in Neighborhood"}>
          <h2 className={styles.sectionHead}>
            <Building2 size={18} aria-hidden="true" />
            {locale === "ar" ? "المراكز والمستشفيات في الحي والمنطقة" : "Clinics & Hospitals in Neighborhood"}
          </h2>
          <div className={styles.grid}>
            {facilities.map((fac: any) => (
              <article key={fac.id} className={styles.card}>
                <h3 className={styles.cardTitle}>{fac.name_ar || fac.name_en}</h3>
                <p className={styles.facilityMeta}>
                  <MapPin size={14} aria-hidden="true" />
                  <span>{fac.district ? `${fac.district}, ${fac.city}` : fac.city}</span>
                </p>
                {fac.accepted_insurance?.length > 0 && (
                  <p className={styles.facilityMeta} style={{ color: "#059669" } as any}>
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>{fac.accepted_insurance.join(", ")}</span>
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
