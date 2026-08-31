import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Search, Stethoscope } from "lucide-react";
import { extractDoctors } from "@/lib/api/doctors";
import { getPublicDoctors } from "@/lib/api/doctors-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
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
  const t = await getTranslations("Doctors"); const response = await getPublicDoctors({ search: sp.q, specialty: sp.specialty, sort: ["rating", "price", "wait"].includes(sp.sort ?? "") ? sp.sort : undefined });
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/consultations/doctors`} className={styles.action}>{t("retry")}</Link></section></main>;
  const doctors = extractDoctors(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><Stethoscope size={28} aria-hidden="true" /></span></section><form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="doctor-search">{t("searchLabel")}</label><input id="doctor-search" name="q" defaultValue={sp.q ?? sp.specialty ?? ""} placeholder={t("searchPlaceholder")} /><button type="submit">{t("search")}</button></form><nav className={styles.sorts} aria-label={t("sortLabel")}>{([["rating", "sortRating"], ["price", "sortPrice"], ["wait", "sortWait"]] as const).map(([sort, key]) => <Link key={sort} href={`/${locale}/consultations/doctors?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : sp.specialty ? { specialty: sp.specialty } : {}), sort }).toString()}`} className={sp.sort === sort ? styles.sortActive : styles.sort}>{t(key)}</Link>)}</nav>{doctors.length === 0 ? <section className={styles.state}><Stethoscope size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{t("emptyBody")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{doctors.map((doctor) => <Link key={doctor.id} href={`/${locale}/consultations/doctors/${doctor.id}`} className={styles.card}><span className={styles.avatar}><Stethoscope size={21} aria-hidden="true" /></span><span className={styles.copy}><strong>{doctor.name ?? t("nameUnavailable")}</strong>{doctor.degree ? <small>{doctor.degree}</small> : null}{doctor.specialty ? <small>{doctor.specialty}</small> : null}<span className={styles.meta}>{doctor.rating !== undefined ? t("rating", { value: doctor.rating }) : null}{doctor.price !== undefined ? t("price", { value: doctor.price }) : null}</span></span><Arrow size={18} aria-hidden="true" /></Link>)}</section>}</main>;
}
