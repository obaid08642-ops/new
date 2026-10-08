import type { Metadata } from "next";
import { ArticlesView, articlesMetadata, type ArticlesViewProps } from "@/app/[locale]/articles/articles-view";

/**
 * The dynamic twin of /articles for a request that carries `?q=` or `?category=` (F82-3: proxy.ts rewrites to it; the
 * address does not change). Same view, reads `searchParams`, never cached, never indexed.
 */
export async function generateMetadata(props: Pick<ArticlesViewProps, "params">): Promise<Metadata> {
  return { ...(await articlesMetadata(props)), robots: { index: false, follow: true } };
}

export default function ArticlesQueryPage(props: ArticlesViewProps) {
  return ArticlesView(props);
}
