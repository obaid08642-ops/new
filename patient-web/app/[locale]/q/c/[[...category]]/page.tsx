import type { Metadata } from "next";
import { CategoryView, categoryMetadata, type CategoryViewProps } from "@/app/[locale]/c/[[...category]]/category-view";

/**
 * The dynamic twin of /c/... for a request that carries `?page=` or `?q=` (F82-3: proxy.ts rewrites to it; the address
 * does not change). Same view, reads `searchParams`, never cached, never indexed.
 */
export async function generateMetadata(props: CategoryViewProps): Promise<Metadata> {
  return { ...(await categoryMetadata(props)), robots: { index: false, follow: true } };
}

export default function CategoryQueryPage(props: CategoryViewProps) {
  return CategoryView(props);
}
