// F82-3: the public pages are static/ISR, so they must be the same HTML for every visitor. These tests pin the rules
// that keep it so (the hard proof is the route table of `next build`, in docs/design/audit/f82-3-static.md):
//  - a page is static only by opting in with `generateStaticParams` (a route with a dynamic segment and none is dynamic);
//  - only the public pages the proxy marks for nonce stamping, and the unavailable page, may opt in (a private page that
//    were static would be served without the per-request nonce its CSP demands);
//  - nothing that a static page or the root layout imports reads the request (cookies, headers, connection, searchParams,
//    a session helper, a no-store fetch).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { QUERY_TWIN_ROUTES } from "../lib/security/query-twin";

vi.mock("next-intl/middleware", async () => {
  const { NextResponse } = await import("next/server");
  return { default: () => () => NextResponse.next() };
});
vi.mock("../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"], defaultLocale: "ar" } }));

const ROOT = resolve(__dirname, "..");
const LOCALE_DIR = join(ROOT, "app/[locale]");

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pageFiles(full);
    return name === "page.tsx" ? [full] : [];
  });
}

const read = (file: string) => readFileSync(file, "utf8");
/** The code of a file without its comments (a comment may name what the code must not do). */
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const optsIn = (file: string) => /export\s+(?:async\s+)?function\s+generateStaticParams\b/.test(read(file));

/** The URL a page file answers, with every dynamic segment filled in. */
function urlOf(file: string) {
  const route = dirname(relative(LOCALE_DIR, file)).replace(/\\/g, "/");
  return `/ar${route === "." ? "" : `/${route}`}`.replace(/\[\[\.\.\.\w+\]\]/g, "x").replace(/\[[^\]]+\]/g, "x").replace(/\/\([^)]*\)/g, "");
}

const STATIC_PAGES = pageFiles(LOCALE_DIR).filter(optsIn);

describe("which pages are static", () => {
  it("finds the public pages that opt in (the Home, categories, product, doctors, articles)", () => {
    const urls = STATIC_PAGES.map(urlOf).sort();
    for (const expected of ["/ar", "/ar/c/x", "/ar/p/x", "/ar/doctor/x", "/ar/consultations/doctors", "/ar/articles", "/ar/articles/x", "/ar/doctors/x/x", "/ar/doctors/x/x/x", "/ar/unavailable"]) {
      expect(urls, expected).toContain(expected);
    }
  });

  describe("every page that opts in is marked by the proxy for nonce stamping (a private page must stay dynamic)", () => {
    let previous: string | undefined;
    beforeEach(() => { previous = process.env.NABD_CSP_EDGE_NONCE; process.env.NABD_CSP_EDGE_NONCE = "1"; vi.resetModules(); });
    afterEach(() => { if (previous === undefined) delete process.env.NABD_CSP_EDGE_NONCE; else process.env.NABD_CSP_EDGE_NONCE = previous; });

    it.each(STATIC_PAGES.map((file) => [urlOf(file)]))("%s", async (url) => {
      const { proxy } = await import("../proxy");
      const { CSP_INJECT_HEADER } = await import("../lib/security/csp");
      const response = await proxy(new NextRequest(new URL(url, "https://nabd.plus"), { headers: { accept: "text/html" } }));
      expect(response.headers.get(CSP_INJECT_HEADER)).toBe("1");
    });
  });

  it("no private page opts in: every page the proxy treats as private has no generateStaticParams", async () => {
    // The same classification as above, the other way round: pages that are not in STATIC_PAGES are dynamic by construction.
    const privatePages = pageFiles(LOCALE_DIR).filter((file) => !optsIn(file));
    expect(privatePages.length).toBeGreaterThan(200);
    for (const file of privatePages) expect(read(file), relative(ROOT, file)).not.toMatch(/generateStaticParams/);
  });
});

describe("revalidate windows", () => {
  const WINDOWS: Record<string, number> = {
    "app/[locale]/page.tsx": 60,
    "app/[locale]/consultations/doctors/page.tsx": 60,
    "app/[locale]/c/[[...category]]/page.tsx": 3600,
    "app/[locale]/p/[slug]/page.tsx": 3600,
    "app/[locale]/articles/page.tsx": 600,
    "app/[locale]/articles/[slug]/page.tsx": 600,
    "app/[locale]/doctor/[slug]/page.tsx": 3600,
    "app/[locale]/doctors/[specialty]/[city]/page.tsx": 3600,
    "app/[locale]/doctors/[specialty]/[city]/[neighborhood]/page.tsx": 3600,
  };

  it.each(Object.entries(WINDOWS))("%s revalidates every %i seconds", (file, seconds) => {
    expect(read(join(ROOT, file))).toMatch(new RegExp(`export const revalidate = ${seconds};`));
  });

  it("the client-side freshness windows of the list pages are the same numbers as their page's revalidate", async () => {
    const doctors = read(join(ROOT, "app/[locale]/consultations/doctors/doctors-view.tsx"));
    const category = read(join(ROOT, "app/[locale]/c/[[...category]]/category-view.tsx"));
    expect(doctors).toMatch(/DOCTORS_REVALIDATE_SECONDS = 60;/);
    expect(category).toMatch(/CATEGORY_REVALIDATE_SECONDS = 3600;/);
    const { ARTICLES_REVALIDATE_SECONDS } = await import("../lib/api/articles-server");
    expect(ARTICLES_REVALIDATE_SECONDS).toBe(600);
  });
});

/** Local source files a file imports (relative paths and the `@/` alias), one level. */
function localImports(file: string): string[] {
  const source = read(file);
  const found: string[] = [];
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = match[1];
    const base = spec.startsWith("@/") ? join(ROOT, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(file), spec) : null;
    if (!base) continue;
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) { found.push(candidate); break; }
    }
  }
  return found;
}

function closure(entry: string): string[] {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file) || !/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
    seen.add(file);
    stack.push(...localImports(file));
  }
  return [...seen];
}

const isClientFile = (file: string) => /^\s*["']use client["']/.test(read(file).replace(/^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/, ""));

/** What a server file must not do when it is part of a page that is rendered once and cached. */
const REQUEST_READS: Array<[string, RegExp]> = [
  ["next/headers", /from\s+["']next\/headers["']/],
  ["cookies()", /\bcookies\s*\(/],
  ["headers()", /\bheaders\s*\(\s*\)/],
  ["connection()", /import\s*\{[^}]*\bconnection\b[^}]*\}\s*from\s*["']next\/server["']/],
  ["unstable_noStore", /unstable_noStore|noStore\s*\(/],
  ["force-dynamic", /force-dynamic/],
  ["a session helper", /requirePatientAccess|getOptionalPatientAccessToken|authCookieNames/],
  ["a no-store fetch", /cache:\s*["']no-store["']/],
  ["the access cookie", /nabd_access|nabd_refresh/],
];

describe("what a static page and the root layout import reads no request data", () => {
  const entries = [join(LOCALE_DIR, "layout.tsx"), ...STATIC_PAGES];

  it.each(entries.map((file) => [relative(ROOT, file), file]))("%s", (_name, entry) => {
    const offenders: string[] = [];
    for (const file of closure(entry as string)) {
      if (isClientFile(file)) continue; // client code cannot read the request; its fetches run in the browser
      const source = code(file);
      for (const [label, pattern] of REQUEST_READS) {
        if (!pattern.test(source)) continue;
        // lib/api/upstream.ts holds both the pure `patientApiUrl` (all a public read imports) and `callPatientApi`, the
        // authenticated call that is `no-store` by design; a static page imports only the first.
        if (label === "a no-store fetch" && /lib\/api\/upstream\.ts$/.test(file.replace(/\\/g, "/"))) continue;
        // `cache: "no-store"` for a search text is a guarded branch of the shared reads (doctors, articles): the static
        // route never reaches it because it passes no query. Only the free-form reads may carry it.
        if (label === "a no-store fetch" && /lib\/api\/(doctors-server|articles-server)\.ts$/.test(file.replace(/\\/g, "/"))) continue;
        offenders.push(`${relative(ROOT, file)}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("a static page's own file does not name searchParams (the shared views take it as an optional prop, passed only by the twin)", () => {
    for (const file of STATIC_PAGES) expect(read(file), relative(ROOT, file)).not.toMatch(/searchParams/);
  });
});

describe("the dynamic twins of the list pages", () => {
  const twinDir = join(LOCALE_DIR, "q");
  const twins = pageFiles(twinDir).map((file) => dirname(relative(twinDir, file)).replace(/\\/g, "/").replace(/\/\[\[\.\.\.\w+\]\]$/, "")).sort();

  it("exist for exactly the routes the proxy rewrites to", () => {
    expect(twins).toEqual([...QUERY_TWIN_ROUTES].sort());
  });

  it("are dynamic (no generateStaticParams), never indexed, and read the same view as their static page", () => {
    for (const file of pageFiles(twinDir)) {
      const source = read(file);
      expect(source, relative(ROOT, file)).not.toMatch(/generateStaticParams/);
      expect(source, relative(ROOT, file)).toMatch(/robots: \{ index: false, follow: true \}/);
      expect(source, relative(ROOT, file)).toMatch(/View\(props\)/);
    }
  });
});

describe("the root layout", () => {
  const layout = read(join(LOCALE_DIR, "layout.tsx"));

  it("is the only root layout and renders <html lang dir> from the locale segment", () => {
    expect(existsSync(join(ROOT, "app/layout.tsx"))).toBe(false);
    expect(layout).toMatch(/<html lang=\{typedLocale\} dir=\{getDirection\(typedLocale\)\}/);
  });

  it("puts no nonce on the theme script (the policy allows it by hash, so the cached HTML carries nothing per request)", () => {
    expect(layout).toMatch(/<script dangerouslySetInnerHTML=\{\{ __html: THEME_INIT_SCRIPT \}\} \/>/);
    const code = layout.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/nonce/i);
  });
});
