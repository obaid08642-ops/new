import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, FlaskConical, Search, ShieldCheck } from "lucide-react";
import { extractLabServices } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";
import { VectorLabs } from "@/components-next/vector-illustrations";

import styles from "../labs/labs.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; category?: string }> };


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/diagnostics/packages", t("diagnostics/packages.title"), t("diagnostics/packages.description"));
}

export default async function LabsPackagesPage({ params, searchParams }: Props) {
  const { locale } = await params; const query = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("LabsPackages");
  const search = (query.q ?? "").trim(); const category = (query.category ?? "").trim();
  const response = await getPublicLabServices({ search, category });
  const rtl = locale === "ar" || locale === "ur"; const Arrow = rtl ? ArrowLeft : ArrowRight;
  if (!response || !response.ok) return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}><section className={styles.state} role="alert" style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16 } as any}><VectorLabs size={48} aria-hidden="true" /><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1><p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/packages`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760 } as any}>{t("retry")}</Link></section></main>;
  const packages = extractLabServices(await response.json().catch(() => null)).filter((item) => item.isPackage !== false);
  const categories = [...new Set(packages.map((item) => item.category).filter(Boolean))] as string[];
  return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
    <section className={styles.hero} style={{ gap: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16 } as any}><div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 }}><p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8 } as any}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1><p className={styles.subtitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("subtitle")}</p></div><span className={styles.heroIcon} style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", display: "grid", placeItems: "center", flex: "0 0 auto" } as any}><VectorLabs size={48} aria-hidden="true" /></span></section>
    <form className={styles.filters} method="get" role="search" style={{ gap: 8, borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 12 } as any}><label className={styles.search} style={{ gap: 8 } as any}><Search size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} /><span className="sr-only">{t("searchLabel")}</span><input name="q" defaultValue={search} placeholder={t("searchPlaceholder")} style={{ color: "#1E332E" } as any} /></label><label className={styles.selectLabel} style={{ gap: 8 } as any}><span style={{ color: "#1E332E" } as any}>{t("category")}</span><select name="category" defaultValue={category} style={{ borderRadius: 20, border: "1px solid #E8EDEE", color: "#1E332E" } as any}><option value="">{t("allCategories")}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button className={styles.submit} type="submit" style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760 } as any}>{t("apply")}</button></form>
    {packages.length === 0 ? <section className={styles.state} style={{ borderRadius: 20, border: "1px dashed #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16 } as any}><VectorLabs size={48} aria-hidden="true" /><h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("emptyTitle")}</h2><p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{search || category ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-label={t("title")} style={{ gap: 16 } as any}>{packages.map((pkg) => { const name = rtl ? pkg.nameAr ?? pkg.nameEn : pkg.nameEn ?? pkg.nameAr; const description = rtl ? pkg.descriptionAr ?? pkg.descriptionEn : pkg.descriptionEn ?? pkg.descriptionAr; return <Link className={styles.card} href={`/${locale}/diagnostics/packages/${pkg.id}`} key={pkg.id} style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 8, padding: 12 } as any}><span className={styles.icon} style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.14)", border: "1px solid #E8EDEE", color: "#1E332E", display: "grid", placeItems: "center", flex: "0 0 auto" } as any}><FlaskConical size={21} aria-hidden="true" /></span><div className={styles.copy} style={{ gap: 8 } as any}><strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{name}</strong>{description ? <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{description}</p> : null}<div className={styles.meta} style={{ gap: 8 } as any}>{pkg.price !== undefined ? <span>{t("price", { value: pkg.price })}</span> : null}{pkg.includedServices?.length ? <span>{t("tests", { count: pkg.includedServices.length })}</span> : null}</div><div className={styles.badges} style={{ gap: 8 } as any}>{pkg.homeVisitSupported ? <span style={{ borderRadius: 20, border: "1px solid #E8EDEE" } as any}>{t("homeVisit")}</span> : null}{pkg.fastingRequired ? <span style={{ borderRadius: 20, border: "1px solid #E8EDEE" } as any}>{t("fasting")}</span> : null}</div></div><Arrow size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} /></Link>; })}</section>}
  </main>;
}
