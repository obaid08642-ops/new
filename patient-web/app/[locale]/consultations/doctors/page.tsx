import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, BadgeCheck, Calendar, Search, Star } from "lucide-react";
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
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus", images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: t("title") }] },
    twitter: { card: "summary_large_image", title: t("title"), description: t("subtitle"), images: ["/images/og-default.jpg"] },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorsPage({ params, searchParams }: Props) {
  const { locale } = await params; const sp = (await searchParams) ?? {}; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Doctors");  let doctors: any[] = [];
  try {
    const response = await getPublicDoctors({ search: sp.q, specialty: sp.specialty, sort: ["rating", "price", "wait"].includes(sp.sort ?? "") ? sp.sort : undefined });
    if (response && response.ok) {
      doctors = extractDoctors(await response.json().catch(() => null));
    }
  } catch {}

  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <section className={styles.hero} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}><BadgeCheck size={14} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
          <p className={styles.subtitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("subtitle")}</p>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}>
          <VectorDoctor size={48} aria-hidden="true" />
        </span>
      </section>

      <form className={styles.search} method="get" role="search" style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 8, padding: 16 } as any}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" style={{ color: "#1E332E" } as any} />
        <label className="sr-only" htmlFor="doctor-search">{t("searchLabel")}</label>
        <input id="doctor-search" name="q" defaultValue={sp.q ?? sp.specialty ?? ""} placeholder={t("searchPlaceholder")} style={{ color: "#1E332E" } as any} />
        <button type="submit" style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760, gap: 8 } as any}>{t("search")}</button>
      </form>

      <nav className={styles.sorts} aria-label={t("sortLabel")} style={{ gap: 8 } as any}>
        {([["rating", "sortRating"], ["price", "sortPrice"], ["wait", "sortWait"]] as const).map(([sort, key]) => (
          <Link
            key={sort}
            href={`/${locale}/consultations/doctors?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : sp.specialty ? { specialty: sp.specialty } : {}), sort }).toString()}`}
            className={sp.sort === sort ? styles.sortActive : styles.sort}
            style={sp.sort === sort ? ({ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE" } as any) : ({ borderRadius: 20, border: "1px solid #E8EDEE", gap: 8 } as any)}
          >
            <span style={{ overflowWrap: "anywhere" } as any}>{t(key)}</span>
          </Link>
        ))}
      </nav>

      {doctors.length === 0 ? (
        <section className={styles.state} style={{ borderRadius: 20, border: "1px dashed #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16, padding: 24 } as any}>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorDoctor size={48} aria-hidden="true" /></span>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("emptyTitle")}</h2>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("emptyBody")}</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")} style={{ gap: 16 } as any}>
          {doctors.map((doctor) => (
            <Link key={doctor.id} href={`/${locale}/consultations/doctors/${doctor.id}`} className={styles.card} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16, padding: 16 } as any}>
              <div className={styles.cardTop} style={{ gap: 16 } as any}>
                <span className={styles.avatar} style={{ width: 48, height: 48, borderRadius: 16, overflow: "hidden", border: "1px solid #E8EDEE", flexShrink: 0, display: "grid", placeItems: "center", position: "relative", background: "rgba(95,217,179,.12)" }}>
                  <Image src={(doctor as any).image || `/images/doctors/${doctor.id}.jpg`} alt={doctor.name || ""} fill sizes="48px" style={{ objectFit: "cover" }} />
                </span>
                <div className={styles.copy} style={{ gap: 8 } as any}>
                  <span className={styles.doctorName} style={{ overflowWrap: "anywhere" } as any}>
                    <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{doctor.name ?? t("nameUnavailable")}</strong>
                    <BadgeCheck size={16} color="#5FD9B3" aria-hidden="true" />
                  </span>
                  {doctor.degree ? <small className={styles.doctorDegree} style={{ overflowWrap: "anywhere" } as any}>{doctor.degree}</small> : null}
                  {doctor.specialty ? (
                    <span className={styles.specialtyBadge} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
                      {doctor.specialty}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={styles.cardBottom} style={{ gap: 8 } as any}>
                <div className={styles.meta} style={{ gap: 8 } as any}>
                  {doctor.rating !== undefined ? (
                    <span className={styles.ratingTag} style={{ overflowWrap: "anywhere" } as any}>
                      <Star size={13} fill="#F59E0B" stroke="#F59E0B" aria-hidden="true" />
                      {t("rating", { value: doctor.rating })}
                    </span>
                  ) : null}
                  {doctor.price !== undefined ? (
                    <span className={styles.priceTag} style={{ overflowWrap: "anywhere" } as any}>
                      {t("price", { value: doctor.price })}
                    </span>
                  ) : null}
                </div>
                <span className={styles.bookButton} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", gap: 8 } as any}>
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
