import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CircleAlert, Image, Search, ShieldCheck } from "lucide-react";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { getPublicRadiologyModalities, getPublicRadiologyServices } from "@/lib/api/radiology-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import styles from "../labs/labs.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RadiologyServices" });
  const canonical = localizedUrl(locale, "/diagnostics/radiology");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/diagnostics/radiology")])), "x-default": localizedUrl("ar", "/diagnostics/radiology") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const on = (value: string | string[] | undefined) => first(value) === "1";
export default async function RadiologyServicesPage({ params, searchParams }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const query = (await searchParams) ?? {}; const search = (first(query.search) ?? "").trim(); const modality = first(query.modality) ?? ""; const bodyPart = first(query.body_part) ?? "";
  const servicesResponse = getPublicRadiologyServices({ modality, bodyPart, search, homeVisit: on(query.home_visit) ? "true" : undefined, homeOnly: on(query.home_only) ? "true" : undefined, highestRated: on(query.highest_rated) ? "true" : undefined, nearest: on(query.nearest) ? "true" : undefined, lowestPrice: on(query.lowest_price) ? "true" : undefined });
  const modalitiesResponse = getPublicRadiologyModalities(); const [servicesResult, modalitiesResult] = await Promise.all([servicesResponse, modalitiesResponse]);
  const t = await getTranslations("RadiologyServices"); const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  if (!servicesResult?.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/radiology`}>{t("retry")}</Link></section></main>;
  const services = extractRadiologyServices(await servicesResult.json().catch(() => null)); const modalityValues = modalitiesResult?.ok ? (await modalitiesResult.json().catch(() => null) as unknown) : []; const modalityList = Array.isArray(modalityValues) ? modalityValues.filter((x): x is string => typeof x === "string") : [];
  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><Image size={28} aria-hidden="true" /></span></section><form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name="search" defaultValue={search} placeholder={t("searchPlaceholder")} /></label><select name="modality" defaultValue={modality} aria-label={t("modalityLabel")}><option value="">{t("allModalities")}</option>{modalityList.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select><input name="body_part" defaultValue={bodyPart} placeholder={t("bodyPartPlaceholder")} aria-label={t("bodyPartLabel")} /><label className={styles.toggle}><input type="checkbox" name="home_visit" value="1" defaultChecked={on(query.home_visit)} />{t("homeVisit")}</label><label className={styles.toggle}><input type="checkbox" name="highest_rated" value="1" defaultChecked={on(query.highest_rated)} />{t("highestRated")}</label><label className={styles.toggle}><input type="checkbox" name="lowest_price" value="1" defaultChecked={on(query.lowest_price)} />{t("lowestPrice")}</label><button className={styles.submit} type="submit">{t("apply")}</button></form>{services.length === 0 ? <section className={styles.state}><Image size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || modality || bodyPart ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{services.map((service) => { const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr; const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr; return <Link className={styles.card} key={service.id} href={`/${locale}/diagnostics/radiology/${encodeURIComponent(service.id)}`}><span className={styles.icon}><Image size={21} aria-hidden="true" /></span><div className={styles.copy}><strong>{name}</strong>{service.shortCode ? <small>{service.shortCode}</small> : null}{description ? <p>{description}</p> : null}<div className={styles.meta}>{service.modality ? <span>{service.modality}</span> : null}{service.bodyPart ? <span>{service.bodyPart}</span> : null}{service.price !== undefined ? <span>{t("price", { value: service.price })}</span> : null}{service.durationMinutes !== undefined ? <span>{t("duration", { value: service.durationMinutes })}</span> : null}</div><div className={styles.badges}>{service.homeVisitSupported ? <span>{t("homeVisit")}</span> : null}{service.facilityVisitSupported ? <span>{t("facilityVisit")}</span> : null}{service.contrastRequired ? <span>{t("contrast")}</span> : null}</div></div><Arrow size={18} aria-hidden="true" /></Link>; })}</section>}</main>;
}
