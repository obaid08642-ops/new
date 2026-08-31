import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, FlaskConical, Home, ShieldCheck } from "lucide-react";
import { extractLabService, parseLabServiceId } from "@/lib/api/labs";
import { getPublicLabPackage } from "@/lib/api/labs-server";
import { isLocale } from "@/lib/i18n";
import styles from "../../labs/labs.module.css";

type Props = { params: Promise<{ locale: string; packageId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ packageId: string; locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const canonical = localizedUrl(locale, `/diagnostics/packages/${encodeURIComponent(packageId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, canonical.replace(`/${locale}`, "") )])), "x-default": localizedUrl("ar", canonical.replace(`/${locale}`, "")) },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function LabPackageDetailPage({ params }: Props) {
  const { locale, packageId } = await params;
  if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  if (!parseLabServiceId(packageId).success) notFound();
  const t = await getTranslations("LabsPackages");
  const response = await getPublicLabPackage(packageId);
  if (!response) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/packages/${packageId}`}>{t("retry")}</Link></section></main>;
  if (response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/packages/${packageId}`}>{t("retry")}</Link></section></main>;
  const pkg = extractLabService(await response.json().catch(() => null));
  if (!pkg) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("invalidBody")}</p></section></main>;
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  const name = rtl ? pkg.nameAr ?? pkg.nameEn : pkg.nameEn ?? pkg.nameAr;
  const description = rtl ? pkg.descriptionAr ?? pkg.descriptionEn : pkg.descriptionEn ?? pkg.descriptionAr;
  const preparation = rtl ? pkg.preparationAr ?? pkg.preparationEn : pkg.preparationEn ?? pkg.preparationAr;
  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/diagnostics/packages`}><Arrow size={17} aria-hidden="true" />{t("back")}</Link>
    <section className={styles.detailHero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{name}</h1>{description ? <p className={styles.subtitle}>{description}</p> : null}</div><span className={styles.heroIcon}><FlaskConical size={28} aria-hidden="true" /></span></section>
    <section className={styles.facts} aria-label={t("facts")}>
      {pkg.price !== undefined ? <div className={styles.fact}><strong>{t("priceLabel")}</strong><span>{t("price", { value: pkg.price })}</span></div> : null}
      {pkg.oldPrice !== undefined && pkg.oldPrice > (pkg.price ?? 0) ? <div className={styles.fact}><strong>{t("previousPrice")}</strong><span>{pkg.oldPrice}</span></div> : null}
      {pkg.includedServices?.length ? <div className={styles.fact}><strong>{t("testsLabel")}</strong><span>{t("tests", { count: pkg.includedServices.length })}</span></div> : null}
      {pkg.turnaroundHours !== undefined ? <div className={styles.fact}><strong>{t("turnaround")}</strong><span>{t("hours", { value: pkg.turnaroundHours })}</span></div> : null}
      {pkg.fastingRequired ? <div className={styles.fact}><strong>{t("preparation")}</strong><span>{pkg.fastingHours ? t("fastingHours", { value: pkg.fastingHours }) : t("fasting")}</span></div> : null}
    </section>
    {pkg.includedServices?.length ? <section className={styles.panel}><h2>{t("includedTitle")}</h2><ul className={styles.included}>{pkg.includedServices.map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></section> : null}
    {preparation?.length ? <section className={styles.panel}><h2>{t("preparationTitle")}</h2><ul className={styles.included}>{preparation.map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></section> : null}
    <section className={styles.notice}><Home size={18} aria-hidden="true" /><p>{pkg.homeVisitSupported ? t("homeAvailable") : t("homeUnavailable")}</p><span aria-hidden="true"><Arrow size={16} /></span></section>
  </main>;
}
