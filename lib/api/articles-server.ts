import { articleSlug } from "@/lib/api/articles";
import { callPatientApi, patientApiUrl } from "@/lib/api/upstream";

function publicArticlePath(path: string) {
  if (!path.startsWith("/articles/") || path.includes("..")) throw new Error("invalid_public_article_path");
  return path;
}
export async function getPublicArticles() {
  try { return await fetch(patientApiUrl("/articles"), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }
}
export async function getPublicArticle(slug: string) {
  if (!articleSlug(slug)) throw new Error("invalid_article_slug");
  try { return await fetch(patientApiUrl(publicArticlePath(`/articles/${slug}`)), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }
}
export function getPatientArticleBookmarks(accessToken: string) { return callPatientApi("/articles/bookmarks/mine", {}, accessToken); }
