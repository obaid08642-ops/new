import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicArticles } from "@/lib/api/articles-server";
import { parseArticleList } from "@/lib/api/articles";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./articles.module.css";
type Props={params:Promise<{locale:string}>};
export default async function ArticlesPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const response=await getPublicArticles();if(!response||!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const articles=parseArticleList(await response.json().catch(()=>null));return <main className={`main ${styles.page}`}><section className={styles.hero}><p className={styles.eyebrow}><FileText size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></section><section className={styles.list}>{articles.map((article)=><Link className={styles.card} key={article.slug} href={`/${locale}/articles/${article.slug}`}><span className={styles.icon}><FileText size={20} aria-hidden="true"/></span><span className={styles.copy}><strong>{locale==="ar"?article.titleAr||article.titleEn:article.titleEn||article.titleAr||t("untitled")}</strong><span>{article.category||t("categoryUnavailable")}</span></span><ChevronLeft className={styles.arrow} size={18} aria-hidden="true"/></Link>)}</section></main>}
