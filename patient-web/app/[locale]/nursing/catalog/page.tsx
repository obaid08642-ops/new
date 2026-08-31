import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { extractNursingCatalog } from "@/lib/api/nursing-catalog";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import styles from "./catalog.module.css";

type Props={params:Promise<{locale:string}>};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "NursingCatalog" });
  const canonical = localizedUrl(locale, "/nursing/catalog");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/nursing/catalog")])), "x-default": localizedUrl("ar", "/nursing/catalog") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

export default async function NursingCatalogPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("NursingCatalog");const response=await getPublicNursingCatalog();if(!response||!response.ok)return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28}/><h1>{t("unavailable")}</h1><p>{t("unavailableBody")}</p></section></main>;const items=extractNursingCatalog(await response.json().catch(()=>null));const rtl=locale==="ar"||locale==="ur";return <main className={`main ${styles.page}`} dir={rtl?"rtl":"ltr"}><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15}/>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><HeartPulse size={28}/></span></section>{items.length===0?<section className={styles.state}><Stethoscope size={26}/><h2>{t("empty")}</h2></section>:<section className={styles.grid} aria-label={t("title")}>{items.map((item)=><article className={styles.card} key={item.id}><span className={styles.icon}><Stethoscope size={21}/></span><div className={styles.copy}><h2>{rtl?item.nameAr??item.nameEn:item.nameEn??item.nameAr}</h2>{(rtl?item.descriptionAr??item.descriptionEn:item.descriptionEn??item.descriptionAr)?<p>{rtl?item.descriptionAr??item.descriptionEn:item.descriptionEn??item.descriptionAr}</p>:null}<div className={styles.meta}>{item.price!==undefined?<span>{t("price",{value:item.price})}</span>:null}{item.durationValue!==undefined||item.duration?<span>{[item.durationValue,item.duration].filter(Boolean).join(" ")}</span>:null}{item.insuranceAvailable?<span>{t("insurance")}</span>:null}</div></div></article>)}</section>}</main>}
