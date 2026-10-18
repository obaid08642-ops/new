import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicArticleCategories, getPublicArticles } from "@/lib/api/articles-server";
import { parseArticleCategories, parseArticleList } from "@/lib/api/articles";
import { isOutage } from "@/lib/api/outage";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { isLocale, locales } from "@/lib/i18n";
import { pickTab } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ArticleRows, ArticleSearch, CategoryChips, ARTICLE_TONE } from "@/components-next/articles/article-kit";
import { HealthTabs } from "@/components-next/health/health-kit";

/**
 * F82-3: the article list is one view with two routes. The static/ISR page (no `searchParams`: the All tab, no search) is
 * the one that is cached and shared; a request with `?q=`, `?category=` or `?tab=` (the Saved tab needs the session) is
 * answered by the dynamic twin under /q (lib/security/query-twin.ts). `searchParams` is undefined on the static route.
 */
export type ArticlesViewProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ tab?: string | string[]; q?: string | string[]; category?: string | string[] }>;
};
/** Renders the Saved tab. Passed only by the dynamic twin: it reads the session, so the static page must not import it. */
type SavedRenderer = (locale: string) => Promise<ReactNode>;
type Props = ArticlesViewProps;

const TABS = ["all", "saved"] as const;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function articlesMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Articles" });
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus";
  return {
    title: t("title"),
    description: t("notice"),
    alternates: {
      canonical: `${origin}/${locale}/articles`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `${origin}/${l}/articles`])),
        "x-default": `${origin}/ar/articles`,
      },
    },
    robots: { index: true, follow: true },
  };
}

/**
 * Health articles (merge map, Batch 10): the tabs All and Saved in `?tab=`. All is the public list (GET /articles, with `?q=` and
 * `?category=`, and GET /articles/categories); Saved is the patient's bookmarks (GET /articles/bookmarks/mine) and needs a sign-in.
 * The old /articles/bookmarks redirects here with `?tab=saved`. No comments (owner decision 1).
 */
export async function ArticlesView({ params, searchParams }: Props, renderSaved?: SavedRenderer) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Articles");
  const rs = await getTranslations("RouteState");
  const query = searchParams ? await searchParams : {};
  const tab = pickTab(query.tab, TABS, "all");
  const q = first(query.q)?.trim().slice(0, 80) || undefined;
  const category = first(query.category)?.trim().slice(0, 120) || undefined;
  const base = `/${locale}/articles`;

  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}`}>
      <HealthTabs label={t("title")} base={base} active={tab} options={[{ value: "all", label: t("tabAll") }, { value: "saved", label: t("tabSaved") }]} />
      {body}
    </ConsultPage>
  );
  const unavailable = () => frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  // the Saved tab reads the session, so it only ever renders on the dynamic twin (?tab=saved), which passes it in
  if (tab === "saved" && renderSaved) return frame(await renderSaved(locale));

  const [response, categoriesResponse] = await Promise.all([getPublicArticles({ q, category }), getPublicArticleCategories()]);
  // A failure (no answer, or a 5xx) on the cached page throws, so Next keeps the last good copy instead of caching an error
  // (stale-if-error, issue 302). On the twin (never cached) the error state with a retry shows, as before.
  if (isOutage(response) && searchParams === undefined) throw new PublicDataUnavailableError("articles");
  if (!response || !response.ok) return unavailable();
  const articles = parseArticleList(await response.json().catch(() => null));
  const categories = categoriesResponse?.ok ? parseArticleCategories(await categoriesResponse.json().catch(() => null)) : [];

  return frame(
    <>
      <ArticleSearch q={q} category={category} placeholder={t("searchPlaceholder")} submitLabel={t("search")} />
      {categories.length ? <CategoryChips label={t("categories")} allLabel={t("allCategories")} base={base} categories={categories} active={category} /> : null}
      {articles.length ? (
        <ArticleRows locale={locale} articles={articles} label={t("title")} untitled={t("untitled")} />
      ) : (
        <ConsultState kind="empty" icon="file-text" tone={ARTICLE_TONE} title={t("noResultsTitle")} body={q || category ? t("noResults") : t("empty")} />
      )}
    </>,
  );
}
