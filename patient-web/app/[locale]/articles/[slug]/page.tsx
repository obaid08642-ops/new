import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicArticle } from "@/lib/api/articles-server";
import { articleSlug, parseArticle } from "@/lib/api/articles";
import { formatDate } from "@/lib/format-date";
import { CiteThis } from "@/components-next/cite-this";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Actions, CONSULT, Facts, Notice, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { SaveArticleButton } from "@/components-next/articles/save-article-button";
import { ARTICLE_TONE, CategoryPill, articleExcerpt, articleTitle } from "@/components-next/articles/article-kit";
import styles from "@/components-next/articles/articles.module.css";

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
  const rs = await getTranslations("RouteState");
  const back = `/${locale}/articles`;
  const response = await getPublicArticle(slug);
  if (response?.status === 404) notFound();
  if (!response || !response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const article = parseArticle(await response.json().catch(() => null));
  if (!article) notFound();
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
    <ConsultPage locale={locale} title={title} backHref={back}>
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
      {article.category ? <CategoryPill>{article.category}</CategoryPill> : null}
      {facts.length ? <SectionCard id="article-facts"><Facts rows={facts} label={title} /></SectionCard> : null}
      <SectionCard id="article-summary" title={t("summary")}>
        <p className={styles.summary} dir="auto">{excerpt || t("excerptUnavailable")}</p>
      </SectionCard>
      <Notice>{t("bodyHidden")}</Notice>
      <Notice>{t("disclaimer")}</Notice>
      <CiteThis
        title={title}
        uri={`https://www.nabd.plus/${locale}/articles/${encodeURIComponent(slug)}`}
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
