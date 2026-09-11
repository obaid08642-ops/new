import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicArticle } from "@/lib/api/articles-server";
import { articleSlug, parseArticle } from "@/lib/api/articles";
import { RetryButton } from "@/components-next/retry-button";
import { CiteThis } from "@/components-next/cite-this";
import styles from "../articles.module.css";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Articles" });
  const canonical = localizedUrl(locale, `/articles/${encodeURIComponent(slug)}`);
  const pathWithoutLocale = `/articles/${encodeURIComponent(slug)}`;
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, pathWithoutLocale)])),
        "x-default": localizedUrl("ar", pathWithoutLocale),
      },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !articleSlug(slug)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Articles");
  const response = await getPublicArticle(slug);
  if (response?.status === 404) notFound();
  if (!response || !response.ok)
    return (
      <main className="main">
        <section className={styles.state} role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  const article = parseArticle(await response.json().catch(() => null));
  if (!article) notFound();
  const title =
    locale === "ar"
      ? article.titleAr || article.titleEn || t("untitled")
      : article.titleEn || article.titleAr || t("untitled");
  const excerpt =
    locale === "ar"
      ? article.excerptAr || article.excerptEn
      : article.excerptEn || article.excerptAr;
  const path = `/articles/${encodeURIComponent(slug)}`;
  const publishedAt = article.publishedAt || null;
  const authorName = article.authorName || null;
  const authorTitle = article.authorTitle || null;
  return (
    <main className={`main ${styles.page}`}>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            ...(excerpt ? { description: excerpt } : {}),
            url: `${path}`,
            inLanguage: locale,
            ...(publishedAt ? { datePublished: publishedAt } : {}),
            ...(authorName ? { author: { "@type": "Person", name: authorName, ...(authorTitle ? { jobTitle: authorTitle } : {}) } } : {}),
          },
          medicalWebPage({ title, description: excerpt ?? null, locale, path }),
          breadcrumbList([
            { name: t("title"), locale, path: "/articles" },
            { name: title, locale, path },
          ]),
        ]}
      />
      <Link className={styles.back} href={`/${locale}/articles`}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <ShieldCheck size={15} aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1>{title}</h1>
        {(authorName || publishedAt) && (
          <p style={{ fontSize: "0.85rem", color: "#64748B" }}>
            {authorName && <span>{authorTitle ? `${authorName} — ${authorTitle}` : authorName}</span>}
            {authorName && publishedAt && <span> · </span>}
            {publishedAt && <time dateTime={publishedAt}>{new Date(publishedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</time>}
          </p>
        )}
        <p>{excerpt || t("excerptUnavailable")}</p>
        <p style={{ fontSize: "0.8rem", color: "#64748B" }}>
          {locale === "ar"
            ? "محتوى تثقيفي عام — لا يغني عن استشارة الطبيب."
            : "General educational content — not a substitute for medical advice."}
        </p>
      </section>
      <CiteThis
        title={title}
        uri={`https://www.nabd.plus/${locale}/articles/${encodeURIComponent(slug)}`}
        author={authorName}
        authorTitle={authorTitle}
        publishedAt={publishedAt}
        locale={locale}
      />
      <section className={styles.notice}>
        <FileText size={20} aria-hidden="true" />
        <p>{t("bodyHidden")}</p>
      </section>
    </main>
  );
}
