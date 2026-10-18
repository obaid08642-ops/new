import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { DIRECT_ANSWER_CLASS } from "@/components-next/seo/direct-answer";
import { isLocale, locales } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicArticle } from "@/lib/api/articles-server";
import { isOutage } from "@/lib/api/outage";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { articleSlug, parseArticle } from "@/lib/api/articles";
import { articleBlocks, articleBodyHtml, type ArticleBlock } from "@/lib/articles/body";
import { formatDate } from "@/lib/format-date";
import { CiteThis } from "@/components-next/cite-this";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Actions, CONSULT, Facts, Notice, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { SaveArticleButton } from "@/components-next/articles/save-article-button";
import { ReadingProgress } from "@/components-next/navigation/reading-progress";
import { ARTICLE_TONE, CategoryPill, articleExcerpt, articleTitle } from "@/components-next/articles/article-kit";
import styles from "@/components-next/articles/articles.module.css";

type Props = { params: Promise<{ locale: string; slug: string }> };

// F82-3: static/ISR. An article is public data only: the same HTML for everyone, generated on the first request for a slug,
// kept for ARTICLES_REVALIDATE_SECONDS (lib/api/articles-server.ts: the same window as the read) and regenerated in the
// background. A failed read throws, so Next keeps the last good copy (stale-if-error, issue 302).
export const revalidate = 600;
export function generateStaticParams() {
  return [];
}

/** The language the article's text is shown in: articles are written in Arabic and/or English. */
function contentLanguage(locale: string, article: { titleAr?: string; titleEn?: string }) {
  if (locale === "ar") return article.titleAr ? "ar" : "en";
  return article.titleEn ? "en" : "ar";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !articleSlug(slug)) return {};
  const t = await getTranslations({ locale, namespace: "Articles" });
  const response = await getPublicArticle(slug).catch(() => null);
  const article = response && response.ok ? parseArticle(await response.json().catch(() => null)) : null;
  // An unpublished or unknown article is not indexed.
  if (!article) return { robots: { index: false, follow: false } };
  const title = articleTitle(locale, article, t("untitled"));
  const description = (articleExcerpt(locale, article) ?? t("subtitle")).replace(/\s+/g, " ").slice(0, 160);
  const pathWithoutLocale = `/articles/${encodeURIComponent(slug)}`;
  const canonical = localizedUrl(locale, pathWithoutLocale);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, pathWithoutLocale)])),
        "x-default": localizedUrl("ar", pathWithoutLocale),
      },
    },
    openGraph: {
      type: "article", url: canonical, title, description,
      ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
      ...(article.coverImage ? { images: [{ url: article.coverImage, alt: title }] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

/**
 * One article (GET /articles/:slug): category, title, author and date, the summary, and the notice that the full text is not shown
 * here yet. The author is the name and title the article carries (it has no doctor id today, so no link to a profile or to booking).
 * Save or unsave it (the button reads the session in the browser, the page itself stays public). No comments (owner decision 1).
 */
export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !articleSlug(slug)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Articles");
  const shared = await getTranslations({ locale, namespace: "Shared" });
  const rs = await getTranslations("RouteState");
  const back = `/${locale}/articles`;
  const response = await getPublicArticle(slug);
  if (response?.status === 404) notFound();
  if (isOutage(response)) throw new PublicDataUnavailableError("article");
  if (!response || !response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const payload = await response.json().catch(() => null);
  const article = parseArticle(payload);
  if (!article) notFound();
  // 10-web#2: the full text, read from the HTML into plain-text blocks (never put into the page as HTML)
  const blocks = articleBlocks(articleBodyHtml(payload, locale));
  const title = articleTitle(locale, article, t("untitled"));
  const excerpt = articleExcerpt(locale, article);
  const path = `/articles/${encodeURIComponent(slug)}`;
  const publishedAt = article.publishedAt || null;
  const authorName = article.authorName || null;
  const authorTitle = article.authorTitle || null;
  const published = formatDate(locale, publishedAt);
  const facts: FactRow[] = [];
  if (authorName) facts.push({ label: t("author"), value: <bdi>{authorTitle ? `${authorName} — ${authorTitle}` : authorName}</bdi>, icon: CONSULT.icon, tone: CONSULT.tone });
  if (published) facts.push({ label: t("published"), value: <time dateTime={publishedAt ?? undefined}>{published}</time>, icon: "calendar-dots", tone: ARTICLE_TONE });

  return (
    <ConsultPage
      locale={locale}
      title={title}
      backHref={back}
      crumbsLabel={shared("breadcrumbLabel")}
      crumbs={[{ label: shared("navHome"), href: `/${locale}` }, { label: t("title"), href: back }, { label: title }]}
    >
      <ReadingProgress label={shared("readingProgress")} />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            ...(excerpt ? { description: excerpt } : {}),
            url: localizedUrl(locale, path),
            // the text is the article's own (Arabic or English); the page chrome is in the reader's locale
            inLanguage: contentLanguage(locale, article),
            ...(article.coverImage ? { image: article.coverImage } : {}),
            publisher: { "@type": "Organization", name: "Nabd Plus", url: siteOrigin() }, // i18n-ok: brand name in structured data
            speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", ".nabd-direct-answer"] },
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
      {article.category ? <CategoryPill>{article.category}</CategoryPill> : null}
      {facts.length ? <SectionCard id="article-facts"><Facts rows={facts} label={title} /></SectionCard> : null}
      <SectionCard id="article-summary" title={t("summary")}>
        <p className={`${excerpt ? `${DIRECT_ANSWER_CLASS} ` : ""}${styles.summary}`} dir="auto">{excerpt || t("excerptUnavailable")}</p>
      </SectionCard>
      {blocks.length ? <SectionCard id="article-body" title={t("bodyTitle")}><ArticleBody blocks={blocks} /></SectionCard> : <Notice>{t("bodyHidden")}</Notice>}
      <Notice>{t("disclaimer")}</Notice>
      <CiteThis
        title={title}
        uri={localizedUrl(locale, `/articles/${encodeURIComponent(slug)}`)}
        author={authorName}
        authorTitle={authorTitle}
        publishedAt={publishedAt}
        locale={locale}
      />
      <Actions>
        <SaveArticleButton slug={slug} locale={locale} />
        <ButtonLink href={back} label={t("back")} variant="outline" size="lg" fullWidth />
      </Actions>
    </ConsultPage>
  );
}

/** The article's text: headings, paragraphs and lists; consecutive list items form one list. */
function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  const groups: Array<ArticleBlock | ArticleBlock[]> = [];
  for (const block of blocks) {
    const tail = groups[groups.length - 1];
    if (block.kind === "li" && Array.isArray(tail)) tail.push(block);
    else groups.push(block.kind === "li" ? [block] : block);
  }
  return (
    <div className={styles.articleBody} dir="auto">
      {groups.map((group, index) => {
        if (Array.isArray(group)) return <ul key={index} className={styles.articleList}>{group.map((item, i) => <li key={i}>{item.text}</li>)}</ul>;
        if (group.kind === "h2") return <h2 key={index} className={styles.articleHeading}>{group.text}</h2>;
        if (group.kind === "h3") return <h3 key={index} className={styles.articleSubheading}>{group.text}</h3>;
        return <p key={index} className={styles.summary}>{group.text}</p>;
      })}
    </div>
  );
}
