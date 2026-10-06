/**
 * F82-3: list pages that take a search or a page number in the query string.
 *
 * A static/ISR page cannot read `searchParams` (that makes it dynamic), and the plain list (no query) is the page that
 * should be static and cached. So the same list exists twice: the static route answers every request without a relevant
 * query, and a request WITH one (`/ar/c?page=2`, `/ar/consultations/doctors?q=...`) is rewritten by next.config.ts to its
 * dynamic twin under `/{locale}/q/...`, which reads `searchParams` and renders the same view. The browser address does
 * not change. Parameters that are not listed (`utm_source`, `fbclid`...) never leave the static page.
 *
 * It is a config rewrite (declarative, resolved inside Next, after the proxy has classified and stamped the request by its
 * ORIGINAL path), not a rewrite made in proxy.ts: a proxy rewrite carries an absolute URL, which Next takes for an external
 * one, and proxies, whenever the server is bound to an IP address (HOSTNAME=127.0.0.1 or 0.0.0.0), as it is behind
 * server/nonce-server.mjs and in the standalone image.
 *
 * Every twin is noindex, canonical to its static page, and never cached by a shared cache.
 */
export const LOCALES = "ar|en|ur|hi|bn|fil";

type Rule = { source: string; params: readonly string[]; twin: string; destination: string };

export const QUERY_TWIN_RULES: readonly Rule[] = [
  { source: `/:locale(${LOCALES})/c/:path*`, params: ["page", "q"], twin: "c", destination: "/:locale/q/c/:path*" },
  { source: `/:locale(${LOCALES})/consultations/doctors`, params: ["q", "specialty", "sort"], twin: "consultations/doctors", destination: "/:locale/q/consultations/doctors" },
  { source: `/:locale(${LOCALES})/articles`, params: ["q", "category"], twin: "articles", destination: "/:locale/q/articles" },
];

type Rewrite = { source: string; destination: string; has: Array<{ type: "query" | "header"; key: string; value?: string }> };

/** One rewrite per (route, parameter): a request with any of the parameters, non-empty, goes to the twin. */
export function queryTwinRewrites(): Rewrite[] {
  return QUERY_TWIN_RULES.flatMap((rule) =>
    rule.params.map((key) => ({ source: rule.source, destination: rule.destination, has: [{ type: "query" as const, key, value: ".+" }] })),
  );
}

/** The twin routes that exist under app/[locale]/q (tests/static-public-pages.test.ts pins this list against the folder). */
export const QUERY_TWIN_ROUTES = QUERY_TWIN_RULES.map((rule) => rule.twin);

/**
 * Request header the nonce server adds when it asks for a public page's URL again after Next answered 5xx (no cached
 * copy and the backend down): the translated unavailable page then answers at that same URL.
 */
export const UNAVAILABLE_FALLBACK_HEADER = "x-nabd-unavailable";

export function unavailablePageRewrite(): Rewrite {
  return { source: `/:locale(${LOCALES})/:path*`, destination: "/:locale/unavailable", has: [{ type: "header", key: UNAVAILABLE_FALLBACK_HEADER, value: "1" }] };
}
