import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, RefreshCw, Search, Stethoscope } from "lucide-react";
import { extractSpecialties } from "@/lib/api/specialties";
import { getPublicSpecialties } from "@/lib/api/specialties-server";
import { isLocale } from "@/lib/i18n";
import styles from "./specialties.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };

export default async function SpecialtySelectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Specialties");
  const response = await getPublicSpecialties();
  const isRtl = locale === "ar" || locale === "ur";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  if (!response || !response.ok) {
    return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Stethoscope size={28} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.retry} href={`/${locale}/consultations/specialties`}><RefreshCw size={16} aria-hidden="true" />{t("retry")}</Link></section></main>;
  }

  const specialties = extractSpecialties(await response.json().catch(() => null));
  const query = q.trim().toLocaleLowerCase(locale);
  const filtered = specialties.filter((specialty) => [specialty.nameAr, specialty.nameEn, specialty.slug].filter(Boolean).some((value) => value!.toLocaleLowerCase(locale).includes(query)));
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><Stethoscope size={28} aria-hidden="true" /></span></section>
    <form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="specialty-search">{t("searchLabel")}</label><input id="specialty-search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} /></form>
    {filtered.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Search size={26} aria-hidden="true" /></span><h2>{t("emptyTitle")}</h2><p>{specialties.length === 0 ? t("emptyBody") : t("noMatch")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{filtered.map((specialty, index) => { const name = locale === "ar" || locale === "ur" ? specialty.nameAr ?? specialty.nameEn : specialty.nameEn ?? specialty.nameAr; const color = ["#1f9fb7", "#695bd4", "#d06b45", "#199b79", "#b87318", "#c25079"][index % 6]; return <Link className={styles.card} key={specialty.slug ?? `${name}-${index}`} href={`/${locale}/appointments?specialty=${encodeURIComponent(specialty.nameAr ?? specialty.nameEn ?? "")}`}><span className={styles.cardIcon} style={{ color, backgroundColor: `${color}18` }}><Stethoscope size={23} aria-hidden="true" /></span><span className={styles.cardCopy}><strong>{name}</strong>{specialty.count !== undefined ? <small>{t("doctorCount", { count: specialty.count })}</small> : null}</span><Arrow size={18} aria-hidden="true" /></Link>; })}</section>}
  </main>;
}
