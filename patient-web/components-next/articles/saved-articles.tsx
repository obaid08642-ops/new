import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPatientArticleBookmarks } from "@/lib/api/articles-server";
import { parseArticleList } from "@/lib/api/articles";
import { requirePatientAccess } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ARTICLE_TONE, ArticleRows } from "@/components-next/articles/article-kit";

/**
 * The Saved tab: the patient's bookmarks (GET /articles/bookmarks/mine). It reads the session, which is why it lives apart from the
 * public list page and why `/articles?tab=saved` is never prefetched in full (lib/nav/prefetch-routes.ts). Call it as a function
 * from the page (`await SavedArticles(...)`), not as an element: it is an async server component.
 */
export async function SavedArticles({ locale }: { locale: Locale }) {
  const t = await getTranslations("Articles");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const failed = <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />;
  let response: Response;
  try {
    response = await getPatientArticleBookmarks(token);
  } catch {
    return failed;
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return failed;
  const saved = parseArticleList(await response.json().catch(() => null));
  if (saved.length === 0) return <ConsultState kind="empty" icon="file-text" tone={ARTICLE_TONE} title={t("emptyTitle")} body={t("savedEmptyBody")} actionLabel={t("browse")} actionHref={`/${locale}/articles`} />;
  return <ArticleRows locale={locale} articles={saved} label={t("tabSaved")} untitled={t("untitled")} />;
}
