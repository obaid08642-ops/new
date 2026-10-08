import type { Metadata } from "next";
import { ArticlesView, articlesMetadata } from "./articles-view";

// F82-3: static/ISR. The article list without a search or a category is the same for everyone; a request with `?q=` or
// `?category=` is answered by the dynamic twin under /q (proxy.ts, lib/security/query-twin.ts). Generated on the first
// request, kept for the window of the reads (ARTICLES_REVALIDATE_SECONDS, ten minutes), regenerated in the background.
export const revalidate = 600;
export function generateStaticParams() {
  return [];
}

export function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return articlesMetadata(props);
}

export default function ArticlesPage({ params }: { params: Promise<{ locale: string }> }) {
  return ArticlesView({ params });
}
