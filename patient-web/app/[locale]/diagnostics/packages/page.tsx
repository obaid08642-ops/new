import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, FlaskConical, Search, ShieldCheck } from "lucide-react";
import { extractLabServices } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { isLocale } from "@/lib/i18n";
import styles from "../labs/labs.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; category?: string }> };

export default async function LabsPackagesPage({ params, searchParams }: Props) {
  const { locale } = await params; const query = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("LabsPackages");
  const search = (query.q ?? "").trim(); const category = (query.category ?? "").trim();
  const response = await getPublicLabServices({ search, category });
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/packages`}>{t("retry")}</Link></section></main>;
  const packages = extractLabServices(await response.json().catch(() => null)).filter((item) => item.isPackage !== false);
  const categories = [...new Set(packages.map((item) => item.category).filter(Boolean))] as string[];
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><FlaskConical size={28} aria-hidden="true" /></span></section>
    <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name="q" defaultValue={search} placeholder={t("searchPlaceholder")} /></label><label className={styles.selectLabel}><span>{t("category")}</span><select name="category" defaultValue={category}><option value="">{t("allCategories")}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button className={styles.submit} type="submit">{t("apply")}</button></form>
    {packages.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || category ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{packages.map((pkg) => { const name = rtl ? pkg.nameAr ?? pkg.nameEn : pkg.nameEn ?? pkg.nameAr; const description = rtl ? pkg.descriptionAr ?? pkg.descriptionEn : pkg.descriptionEn ?? pkg.descriptionAr; return <Link className={styles.card} href={`/${locale}/diagnostics/packages/${pkg.id}`} key={pkg.id}><span className={styles.icon}><FlaskConical size={21} aria-hidden="true" /></span><div className={styles.copy}><strong>{name}</strong>{description ? <p>{description}</p> : null}<div className={styles.meta}>{pkg.price !== undefined ? <span>{t("price", { value: pkg.price })}</span> : null}{pkg.includedServices?.length ? <span>{t("tests", { count: pkg.includedServices.length })}</span> : null}</div><div className={styles.badges}>{pkg.homeVisitSupported ? <span>{t("homeVisit")}</span> : null}{pkg.fastingRequired ? <span>{t("fasting")}</span> : null}</div></div><Arrow size={18} aria-hidden="true" /></Link>; })}</section>}
  </main>;
}
