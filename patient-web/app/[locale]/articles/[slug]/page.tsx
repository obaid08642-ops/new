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
            url: localizedUrl(locale, path),
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
        <ChevronLeft size={48} aria-hidden="true" style={{ width: 17, height: 17 }} />
        {t("back")}
      </Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <ShieldCheck size={48} aria-hidden="true" style={{ width: 16, height: 16 }} />
          {t("eyebrow")}
        </p>
        <h1>{title}</h1>
        {(authorName || publishedAt) && (
          <p className={styles.meta}>
            {authorName && <span dir="auto">{authorTitle ? `${authorName} — ${authorTitle}` : authorName}</span>}
            {authorName && publishedAt && <span> · </span>}
            {publishedAt && <time dateTime={publishedAt}>{new Date(publishedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</time>}
          </p>
        )}
        <p>{excerpt || t("excerptUnavailable")}</p>
        <p className={styles.disclaimer}>
          {locale === "ar"
            ? "محتوى تثقيفي عام — لا يغني عن استشارة الطبيب."
            : "General educational content — not a substitute for medical advice."}
        </p>
      </section>
      <section
        aria-label={locale === "ar" ? "الموثوقية والمراجعة" : "Trust and review"}
        style={{
          display: "grid",
          gap: 8,
          padding: 16,
          border: "1px solid var(--nabd-color-border-subtle)",
          borderRadius: 20,
          background: "var(--nabd-color-glass-bg)",
        }}
      >
        {/* 13.R15: review badge reflects ONLY backend-returned fields. The public
            article payload carries no reviewer/refs fields, so this page renders
            the pending-review state — never a fabricated human-reviewed claim. */}
        <p
          role="status"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            margin: 0,
            padding: "4px 12px",
            borderRadius: 9999,
            border: "1px solid var(--nabd-color-border-subtle)",
            background: "var(--nabd-color-status-warning-bg)",
            color: "var(--nabd-color-text-primary)",
            fontSize: 13,
            fontWeight: 700,
            width: "fit-content",
            overflowWrap: "anywhere",
          }}
        >
          <ShieldCheck size={48} aria-hidden="true" style={{ width: 16, height: 16 }} />
          {locale === "ar"
            ? "بانتظار المراجعة البشرية — تحقق مع الطبيب"
            : "Pending human review — verify with a clinician"}
        </p>
        <dl style={{ display: "grid", gap: 4, margin: 0, fontSize: "0.85rem", color: "var(--nabd-color-text-primary)" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <dt style={{ fontWeight: 700 }}>{locale === "ar" ? "الكاتب:" : "Author:"}</dt>
            <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
              {authorName ? (
                <span dir="auto">{authorTitle ? `${authorName} — ${authorTitle}` : authorName}</span>
              ) : locale === "ar" ? (
                "لم يُرجع الخادم اسم الكاتب."
              ) : (
                "No author was returned."
              )}
            </dd>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <dt style={{ fontWeight: 700 }}>{locale === "ar" ? "المراجع:" : "Reviewer:"}</dt>
            <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
              {locale === "ar"
                ? "لا توجد بيانات مراجع — لم يُرجع الخادم اسم المراجع أو تاريخ المراجعة."
                : "No reviewer data — the backend did not return a reviewer name or review date."}
            </dd>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <dt style={{ fontWeight: 700 }}>{locale === "ar" ? "المراجع العلمية:" : "References:"}</dt>
            <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
              {locale === "ar" ? "لا توجد قائمة مراجع — لم يُرجعها الخادم." : "No reference list was returned."}
            </dd>
          </div>
        </dl>
      </section>
      <CiteThis
        title={title}
        uri={localizedUrl(locale, `/articles/${encodeURIComponent(slug)}`)}
        author={authorName}
        authorTitle={authorTitle}
        publishedAt={publishedAt}
        locale={locale}
      />
      <section className={styles.notice}>
        <FileText size={48} aria-hidden="true" style={{ width: 20, height: 20, flexShrink: 0, color: "#1E332E" }} />
        <p>{t("bodyHidden")}</p>
      </section>
    </main>
  );
}
