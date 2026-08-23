import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, HousePlus, Search } from "lucide-react";
import { extractHomeCareServices } from "@/lib/api/home-care-services";
import { getPatientHomeCareServices } from "@/lib/api/home-care-services-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import styles from "./services.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };

export default async function HomeCareServicesPage({ params, searchParams }: Props) {
  const { locale } = await params; const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("HomeCareServices");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHomeCareServices(token);
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/home-care/services`} className={styles.action}>{t("retry")}</Link></section></main>;
  const services = extractHomeCareServices(await response.json().catch(() => null));
  const query = q.trim().toLocaleLowerCase(locale);
  const filtered = services.filter((service) => [service.nameAr, service.nameEn, service.descriptionAr, service.descriptionEn].filter(Boolean).some((value) => value!.toLocaleLowerCase(locale).includes(query)));
  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><HousePlus size={28} aria-hidden="true" /></span></section><form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="home-care-search">{t("searchLabel")}</label><input id="home-care-search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} /></form>{filtered.length === 0 ? <section className={styles.state}><HousePlus size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{services.length === 0 ? t("emptyBody") : t("noMatch")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{filtered.map((service, index) => { const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr; const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr; const color = ["#1499a7", "#6a5bd5", "#c27629", "#1b9277", "#c45572"][index % 5]; return <Link href={`/${locale}/home-care/services/${service.id}`} className={styles.card} key={service.id}><span className={styles.icon} style={{ backgroundColor: `${color}18`, color }}><HousePlus size={22} aria-hidden="true" /></span><span className={styles.copy}><strong>{name}</strong>{description ? <small>{description}</small> : null}{service.price !== undefined ? <small>{t("price", { value: service.price })}</small> : null}</span><Arrow size={18} aria-hidden="true" /></Link>; })}</section>}</main>;
}
