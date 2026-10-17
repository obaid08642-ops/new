// Issue 1548: a first visit to a product page was a cold render (TTFB 3 s on production): 21k products, none rendered
// ahead. The product page is ISR (revalidate 3600 s) and builds with no backend, so instead of a build-time
// generateStaticParams this asks Next, once it is up, for the most-visited products (the public search with no term is
// ordered by usage_count) and for the public list pages. Each answer lands in the same ISR cache a visitor's request would
// fill; nothing else is stored. Off unless NABD_WARM_TOP_PRODUCTS is a positive number.
//
//   NABD_WARM_TOP_PRODUCTS=300 NABD_WARM_LOCALES=ar,en node server/nonce-server.mjs
import http from "node:http";

const LOCALES = new Set(["ar", "en", "ur", "hi", "bn", "fil"]);

/** The settings from the environment: how many products, which locales; null when warming is off. */
export function warmSettings(env = process.env) {
  const top = Math.min(Number.parseInt(env.NABD_WARM_TOP_PRODUCTS || "0", 10) || 0, 1000);
  if (top <= 0) return null;
  const locales = String(env.NABD_WARM_LOCALES || "ar").split(",").map((s) => s.trim()).filter((s) => LOCALES.has(s));
  const api = String(env.NABD_API_BASE_URL || "").replace(/\/$/, "");
  if (!api || locales.length === 0) return null;
  return { top, locales, api };
}

/** The page paths to warm for a locale: its home, the catalogue, then each product slug in the order given. */
export function warmPaths(locale, slugs) {
  return [`/${locale}`, `/${locale}/c`, ...slugs.filter((s) => typeof s === "string" && s).map((s) => `/${locale}/p/${encodeURIComponent(s)}`)];
}

function getPage(port, path) {
  return new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port, method: "GET", path, headers: { accept: "text/html" } }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode || 0));
    });
    req.on("error", () => resolve(0));
    req.setTimeout(30000, () => req.destroy());
    req.end();
  });
}

/** Asks the internal Next server for the pages, two at a time so a starting instance is not flooded. Returns the counts. */
export async function warmPublicPages(port, settings, fetchJson = (url) => fetch(url, { headers: { accept: "application/json" } }).then((r) => (r.ok ? r.json() : null))) {
  const done = { ok: 0, failed: 0 };
  for (const locale of settings.locales) {
    const data = await fetchJson(`${settings.api}/public/products/search?locale=${locale}&limit=${settings.top}`).catch(() => null);
    const slugs = Array.isArray(data?.items) ? data.items.map((item) => item?.slug) : [];
    const queue = warmPaths(locale, slugs);
    const worker = async () => {
      for (let path = queue.shift(); path; path = queue.shift()) {
        const status = await getPage(port, path);
        if (status === 200) done.ok += 1; else done.failed += 1;
      }
    };
    await Promise.all([worker(), worker()]);
  }
  return done;
}
