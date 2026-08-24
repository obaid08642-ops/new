import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicArticle } from "@/lib/api/articles-server";
import { articleSlug, parseArticle } from "@/lib/api/articles";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../articles.module.css";
type Props={params:Promise<{locale:string;slug:string}>};
export default async function ArticlePage({params}:Props){const {locale,slug}=await params;if(!isLocale(locale)||!articleSlug(slug))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const response=await getPublicArticle(slug);if(response?.status===404)notFound();if(!response||!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const article=parseArticle(await response.json().catch(()=>null));if(!article)notFound();const title=locale==="ar"?article.titleAr||article.titleEn||t("untitled"):article.titleEn||article.titleAr||t("untitled");const excerpt=locale==="ar"?article.excerptAr||article.excerptEn:article.excerptEn||article.excerptAr;return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/articles`}><ChevronLeft size={17} aria-hidden="true"/>{t("back")}</Link><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{title}</h1><p>{excerpt||t("excerptUnavailable")}</p></section><section className={styles.notice}><FileText size={20} aria-hidden="true"/><p>{t("bodyHidden")}</p></section></main>}
