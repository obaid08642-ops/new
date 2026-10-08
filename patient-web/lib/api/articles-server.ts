import { articleQuery, articleSlug } from "@/lib/api/articles";
import { callPatientApi, patientApiUrl } from "@/lib/api/upstream";

function publicArticlePath(path: string) {
  if (!path.startsWith("/articles/") || path.includes("..")) throw new Error("invalid_public_article_path");
  return path;
}
/**
 * F82-3: the public article reads were `force-cache` (kept forever, so a static page made from them never saw an edit).
 * They are public and the same for everyone, so they are kept for ten minutes, the window of the static article pages.
 */
export const ARTICLES_REVALIDATE_SECONDS = 600;
const publicRead = { next: { revalidate: ARTICLES_REVALIDATE_SECONDS } } as const;

export async function getPublicArticles(query: { q?: string; category?: string; page?: number } = {}) {
  // A search text is free-form and would fill the data cache with one entry per query: it is never cached.
  const read = (query.q ?? "").trim() ? ({ cache: "no-store" } as const) : publicRead;
  try { return await fetch(patientApiUrl(articleQuery(query)), { headers: { Accept: "application/json" }, ...read }); } catch { return null; }
}
export async function getPublicArticleCategories() {
  try { return await fetch(patientApiUrl("/articles/categories"), { headers: { Accept: "application/json" }, ...publicRead }); } catch { return null; }
}
export async function getPublicArticle(slug: string) {
  if (!articleSlug(slug)) throw new Error("invalid_article_slug");
  try { return await fetch(patientApiUrl(publicArticlePath(`/articles/${slug}`)), { headers: { Accept: "application/json" }, ...publicRead }); } catch { return null; }
}
export function getPatientArticleBookmarks(accessToken: string) { return callPatientApi("/articles/bookmarks/mine", {}, accessToken); }
