import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, FlaskConical, Search, ShieldCheck } from "lucide-react";
import { extractLabServices } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import styles from "./labs.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; home?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const canonical = localizedUrl(locale, "/diagnostics/labs");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/diagnostics/labs")])), "x-default": localizedUrl("ar", "/diagnostics/labs") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

export default async function LabsServicesPage({ params, searchParams }: Props) {
  const { locale } = await params; const query = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("LabsServices");
  const search = (query.q ?? "").trim(); const homeOnly = query.home === "1";
  const response = await getPublicLabServices({ search, homeOnly });
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/labs`}>{t("retry")}</Link></section></main>;
  const services = extractLabServices(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><FlaskConical size={28} aria-hidden="true" /></span></section>
    <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name="q" defaultValue={search} placeholder={t("searchPlaceholder")} /></label><label className={styles.toggle}><input type="checkbox" name="home" value="1" defaultChecked={homeOnly} />{t("homeOnly")}</label><button className={styles.submit} type="submit">{t("apply")}</button></form>
    {services.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || homeOnly ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{services.map((service) => { const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr; const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr; return <Link className={styles.card} key={service.id} href={`/${locale}/diagnostics/labs/book?serviceId=${encodeURIComponent(service.id)}`}><span className={styles.icon}><FlaskConical size={21} aria-hidden="true" /></span><div className={styles.copy}><strong>{name}</strong>{service.shortCode ? <small>{service.shortCode}</small> : null}{description ? <p>{description}</p> : null}<div className={styles.meta}>{service.price !== undefined ? <span>{t("price", { value: service.price })}</span> : null}{service.sampleType ? <span>{service.sampleType}</span> : null}{service.fastingRequired ? <span>{t("fasting")}</span> : null}</div><div className={styles.badges}>{service.homeVisitSupported ? <span>{t("homeVisit")}</span> : null}{service.facilityVisitSupported ? <span>{t("facilityVisit")}</span> : null}{service.unavailable ? <span>{t("unavailable")}</span> : null}</div></div><Arrow size={18} aria-hidden="true" /></Link>; })}</section>}
  </main>;
}
