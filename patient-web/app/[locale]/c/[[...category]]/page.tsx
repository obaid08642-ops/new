import type { Metadata } from "next";
import { CategoryView, categoryMetadata } from "./category-view";

type Props = { params: Promise<{ locale: string; category?: string[] }> };

// F82-3: static/ISR. Page 1 of a category without a search is the same for everyone; a request with `?page=` or `?q=` is
// answered by the dynamic twin under /q (proxy.ts, lib/security/query-twin.ts). Generated on the first request for a path,
// kept for the window of the catalogue reads (one hour; CATEGORY_REVALIDATE_SECONDS in the view is the same number, pinned by
// tests/static-public-pages.test.ts), regenerated in the background.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return categoryMetadata({ params });
}

export default function CategoryPage({ params }: Props) {
  return CategoryView({ params });
}
