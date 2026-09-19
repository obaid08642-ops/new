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
import { VectorHealthShield } from "@/components-next/vector-illustrations";
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
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
        <section className={styles.state} role="alert" style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, gap: 16, display: "grid", justifyItems: "center" }}>
          <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true"><VectorHealthShield size={48} aria-hidden="true" /></span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailable")}</p>
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
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
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
      <Link className={styles.back} href={`/${locale}/articles`} style={{ color: "#1E332E", border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", fontWeight: 700, textDecoration: "none", width: "fit-content", display: "inline-flex", alignItems: "center", gap: 8 }}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={14} aria-hidden="true" />
            <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("eyebrow")}</span>
          </p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{title}</h1>
          {(authorName || publishedAt) && (
            <p className={styles.meta} style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
              {authorName && <span dir="auto">{authorTitle ? `${authorName} — ${authorTitle}` : authorName}</span>}
              {authorName && publishedAt && <span> · </span>}
              {publishedAt && <time dateTime={publishedAt}>{new Date(publishedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</time>}
            </p>
          )}
          <p style={{ color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{excerpt || t("excerptUnavailable")}</p>
          <p className={styles.disclaimer} style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {locale === "ar" ? "محتوى تثقيفي عام — لا يغني عن استشارة الطبيب." : "General educational content — not a substitute for medical advice."}
          </p>
        </div>
        <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true"><VectorHealthShield size={48} aria-hidden="true" /></span>
      </section>
      <CiteThis
        title={title}
        uri={`https://www.nabd.plus/${locale}/articles/${encodeURIComponent(slug)}`}
        author={authorName}
        authorTitle={authorTitle}
        publishedAt={publishedAt}
        locale={locale}
      />
      <section className={styles.notice} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, gap: 8 }}>
        <FileText size={20} aria-hidden="true" style={{ flexShrink: 0, color: "#1E332E" }} />
        <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("bodyHidden")}</p>
      </section>
    </main>
  );
}
