import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicArticleCategories, getPublicArticles } from "@/lib/api/articles-server";
import { parseArticleCategories, parseArticleList } from "@/lib/api/articles";
import { isLocale, locales } from "@/lib/i18n";
import { pickTab } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ArticleRows, ArticleSearch, CategoryChips, ARTICLE_TONE } from "@/components-next/articles/article-kit";
import { SavedArticles } from "@/components-next/articles/saved-articles";
import { HealthTabs } from "@/components-next/health/health-kit";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ tab?: string | string[]; q?: string | string[]; category?: string | string[] }> };

const TABS = ["all", "saved"] as const;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
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
export default async function ArticlesPage({ params, searchParams }: Props) {
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

  if (tab === "saved") return frame(await SavedArticles({ locale }));

  const [response, categoriesResponse] = await Promise.all([getPublicArticles({ q, category }), getPublicArticleCategories()]);
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
