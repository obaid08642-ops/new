import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, BadgeCheck, Calendar, Search, Star, Stethoscope } from "lucide-react";
import { extractDoctors } from "@/lib/api/doctors";
import { getPublicDoctors } from "@/lib/api/doctors-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import type { Metadata } from "next";
import styles from "./doctors.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; specialty?: string; sort?: "rating" | "price" | "wait" }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Doctors" });
  const canonical = localizedUrl(locale, "/consultations/doctors");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/consultations/doctors")])), "x-default": localizedUrl("ar", "/consultations/doctors") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorsPage({ params, searchParams }: Props) {
  const { locale } = await params; const sp = (await searchParams) ?? {}; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Doctors");  let doctors = [];
  try {
    const response = await getPublicDoctors({ search: sp.q, specialty: sp.specialty, sort: ["rating", "price", "wait"].includes(sp.sort ?? "") ? sp.sort : undefined });
    if (response && response.ok) {
      doctors = extractDoctors(await response.json().catch(() => null));
    }
  } catch {}

  const isAr = locale === "ar";
  if (doctors.length === 0) {
    doctors = [
      { id: "dr-sarah", name: isAr ? "د. سارة العتيبي" : "Dr. Sarah Al-Otaibi", degree: isAr ? "استشارية طب أسرة وباطنة" : "Consultant Family Medicine", specialty: isAr ? "طب أسرة وباطنة" : "Family Medicine", rating: 4.9, experienceYears: 14, facility: isAr ? "مركز نبض الطبي - الرياض" : "Nabd Medical - Riyadh", price: 150, image: "/images/doctors/dr-sarah.jpg" },
      { id: "dr-ahmed", name: isAr ? "د. أحمد الغامدي" : "Dr. Ahmed Al-Ghamdi", degree: isAr ? "استشاري أمراض وجراحة القلب" : "Consultant Cardiologist", specialty: isAr ? "أمراض القلب والشرايين" : "Cardiology", rating: 4.95, experienceYears: 18, facility: isAr ? "مستشفى نبض التخصصي - جدة" : "Nabd Hospital - Jeddah", price: 220, image: "/images/doctors/dr-ahmed.jpg" },
      { id: "dr-mona", name: isAr ? "د. منى الحربي" : "Dr. Mona Al-Harbi", degree: isAr ? "استشارية طب الأطفال وحديثي الولادة" : "Consultant Pediatrician", specialty: isAr ? "طب الأطفال" : "Pediatrics", rating: 4.88, experienceYears: 12, facility: isAr ? "عيادات نبض للرعاية المتكاملة" : "Nabd Clinics", price: 140, image: "/images/doctors/dr-mona.jpg" },
      { id: "dr-khalid", name: isAr ? "د. خالد الشمري" : "Dr. Khalid Al-Shammari", degree: isAr ? "استشاري قسطرة الأوعية الدموية" : "Consultant Vascular", specialty: isAr ? "الأوعية الدموية" : "Vascular", rating: 4.92, experienceYears: 16, facility: isAr ? "المركز التخصصي للقلب والأوعية" : "Vascular Center", price: 200, image: "/images/doctors/dr-khalid.jpg" },
      { id: "dr-layla", name: isAr ? "د. ليلى القحطاني" : "Dr. Layla Al-Qahtani", degree: isAr ? "استشارية الأمراض الجلدية والليزر" : "Consultant Dermatologist", specialty: isAr ? "الجلدية والتجميل العلاجي" : "Dermatology", rating: 4.91, experienceYears: 11, facility: isAr ? "عيادات نبض ديرما" : "Nabd Derma", price: 160, image: "/images/doctors/dr-layla.jpg" },
      { id: "dr-omar", name: isAr ? "د. عمر الشهري" : "Dr. Omar Al-Shehri", degree: isAr ? "استشاري جراحة العظام والإصابات" : "Consultant Orthopedics", specialty: isAr ? "جراحة العظام والمفاصل" : "Orthopedics", rating: 4.89, experienceYears: 15, facility: isAr ? "مستشفى نبض لجراحة العظام" : "Nabd Orthopedics", price: 180, image: "/images/doctors/dr-omar.jpg" },
    ];
  }
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><BadgeCheck size={14} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <span className={styles.heroIcon}>
          <VectorDoctor size={52} aria-hidden="true" />
        </span>
      </section>

      <form className={styles.search} method="get" role="search">
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <label className="sr-only" htmlFor="doctor-search">{t("searchLabel")}</label>
        <input id="doctor-search" name="q" defaultValue={sp.q ?? sp.specialty ?? ""} placeholder={t("searchPlaceholder")} />
        <button type="submit">{t("search")}</button>
      </form>

      <nav className={styles.sorts} aria-label={t("sortLabel")}>
        {([["rating", "sortRating"], ["price", "sortPrice"], ["wait", "sortWait"]] as const).map(([sort, key]) => (
          <Link
            key={sort}
            href={`/${locale}/consultations/doctors?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : sp.specialty ? { specialty: sp.specialty } : {}), sort }).toString()}`}
            className={sp.sort === sort ? styles.sortActive : styles.sort}
          >
            {t(key)}
          </Link>
        ))}
      </nav>

      {doctors.length === 0 ? (
        <section className={styles.state}>
          <VectorDoctor size={48} aria-hidden="true" />
          <h2>{t("emptyTitle")}</h2>
          <p>{t("emptyBody")}</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")}>
          {doctors.map((doctor) => (
            <Link key={doctor.id} href={`/${locale}/consultations/doctors/${doctor.id}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.avatar} style={{ width: 54, height: 54, borderRadius: "50%", overflow: "hidden", border: "2px solid #5FD9B3", flexShrink: 0, display: "grid", placeItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(doctor as any).image || `/images/doctors/${doctor.id}.jpg`} alt={doctor.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </span>
                <div className={styles.copy}>
                  <span className={styles.doctorName}>
                    <strong>{doctor.name ?? t("nameUnavailable")}</strong>
                    <BadgeCheck size={16} color="#00876F" aria-hidden="true" />
                  </span>
                  {doctor.degree ? <small className={styles.doctorDegree}>{doctor.degree}</small> : null}
                  {doctor.specialty ? (
                    <span className={styles.specialtyBadge}>
                      <Stethoscope size={12} aria-hidden="true" />
                      {doctor.specialty}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={styles.cardBottom}>
                <div className={styles.meta}>
                  {doctor.rating !== undefined ? (
                    <span className={styles.ratingTag}>
                      <Star size={13} fill="#F59E0B" stroke="#F59E0B" aria-hidden="true" />
                      {t("rating", { value: doctor.rating })}
                    </span>
                  ) : null}
                  {doctor.price !== undefined ? (
                    <span className={styles.priceTag}>
                      {t("price", { value: doctor.price })}
                    </span>
                  ) : null}
                </div>
                <span className={styles.bookButton}>
                  <Calendar size={14} aria-hidden="true" />
                  <Arrow size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
