import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, Image, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseRadiologyService, parseRadiologyServiceId } from "@/lib/api/radiology";
import { getPublicRadiologyServiceDetail } from "@/lib/api/radiology-server";
import { isLocale } from "@/lib/i18n";
import styles from "../../labs/labs.module.css";

type Props = { params: Promise<{ locale: string; serviceId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ serviceId: string; locale: string }> }): Promise<Metadata> {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RadiologyServices" });
  const canonical = localizedUrl(locale, `/diagnostics/radiology/${encodeURIComponent(serviceId)}`);
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

export default async function RadiologyServiceDetailPage({ params }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale) || !parseRadiologyServiceId(serviceId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("RadiologyServices");
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const response = await getPublicRadiologyServiceDetail(serviceId);
  if (response.status === 404) notFound();
  if (!response.ok) {
    return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/radiology`}>{t("backToRadiology")}</Link></section></main>;
      <JsonLd data={[medicalWebPage({ name: t("title"), locale, path: "/diagnostics/radiology" }), breadcrumbList([{ name: t("title"), locale, path: "/diagnostics/radiology" }])]} />
  }
  const service = parseRadiologyService(await response.json().catch(() => null));
  if (!service) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("invalidResponse")}</p><Link className={styles.action} href={`/${locale}/diagnostics/radiology`}>{t("backToRadiology")}</Link></section></main>;
  const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr;
  const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr;
  const preparation = rtl ? service.preparationAr ?? service.preparationEn : service.preparationEn ?? service.preparationAr;
  return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/diagnostics/radiology`}><Arrow size={17} aria-hidden="true" />{t("backToRadiology")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{name}</h1><p className={styles.subtitle}>{description ?? t("detailDescriptionUnavailable")}</p></div><span className={styles.heroIcon}><Image size={28} aria-hidden="true" /></span></section><section className={styles.detailCard} aria-label={t("detailTitle")}><div className={styles.meta}>{service.modality ? <span>{service.modality}</span> : null}{service.bodyPart ? <span>{service.bodyPart}</span> : null}{service.price !== undefined ? <span>{t("price", { value: service.price })}</span> : null}{service.durationMinutes !== undefined ? <span>{t("duration", { value: service.durationMinutes })}</span> : null}{service.turnaroundHours !== undefined ? <span>{t("turnaround", { value: service.turnaroundHours })}</span> : null}</div><div className={styles.badges}>{service.homeVisitSupported ? <span>{t("homeVisit")}</span> : null}{service.facilityVisitSupported ? <span>{t("facilityVisit")}</span> : null}{service.contrastRequired ? <span>{t("contrast")}</span> : null}{service.fastingRequired ? <span>{t("fasting")}</span> : null}</div>{preparation?.length ? <div className={styles.section}><h2>{t("preparationTitle")}</h2><ul>{preparation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}<p className={styles.notice}>{t("bookingUnavailableNotice")}</p></section></main>;
}
