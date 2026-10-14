import type { Metadata } from "next";
import { ArticlesView, articlesMetadata, type ArticlesViewProps } from "@/app/[locale]/articles/articles-view";
import { SavedArticles } from "@/components-next/articles/saved-articles";
import type { Locale } from "@/lib/i18n";

/**
 * The dynamic twin of /articles for a request that carries `?q=`, `?category=` or `?tab=` (the Saved tab reads the session) (F82-3: proxy.ts rewrites to it; the
 * address does not change). Same view, reads `searchParams`, never cached, never indexed.
 */
export async function generateMetadata(props: Pick<ArticlesViewProps, "params">): Promise<Metadata> {
  return { ...(await articlesMetadata(props)), robots: { index: false, follow: true } };
}

export default function ArticlesQueryPage(props: ArticlesViewProps) {
  return ArticlesView(props, (locale) => SavedArticles({ locale: locale as Locale }));
}
