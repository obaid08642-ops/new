import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminErrorBoundary } from "@/components/AdminErrorBoundary";

/**
 * 15.5 — a boundary per route segment.
 *
 * The admin is a Pages Router app: `error.tsx` / `global-error.tsx` per route
 * segment are an App Router convention and have no effect here, so the same
 * isolation is provided by wrapping the tree in `AdminErrorBoundary` keyed on
 * the current top-level segment. The segment key makes the boundary reset on
 * navigation, so a crash in one area of the admin does not blank the whole app.
 */
function segmentFor(pathname: string): string {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (!first) return '/';
  return second ? `/${first}/${second}` : `/${first}`;
}

export default function App({ Component, pageProps, router }: AppProps) {
  const segment = segmentFor(router.pathname);
  const page = <Component {...pageProps} />;

  // Public pages (login, catalogue, SEO slugs) are not behind the admin session.
  const guarded = router.pathname.startsWith('/admin') ? <AdminGuard>{page}</AdminGuard> : page;

  return (
    <AdminErrorBoundary segment={segment}>
      {guarded}
    </AdminErrorBoundary>
  );
}

// 15.5: crash reporting for the browser bundle. Imported for its side effect
// only, and only in the browser, so the Sentry SDK never enters SSR.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  void import('@/sentry.client.config');
}