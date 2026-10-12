import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * AC-5 (docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md) and the owner's SEO request (2026-10-12):
 * every URL and path that a discovery file names must resolve. The files are rendered through their
 * own route handlers (so dynamic documents are checked too), every URL is collected, and each one is
 * checked against the routes that answer it in production:
 *
 *   nabd.plus / www.nabd.plus  → the patient web (app/ routes, next.config redirects, public/)
 *   api.nabd.plus              → the backend (backend/openapi.json paths)
 *   mcp.nabd.plus              → the backend paths deploy/nginx/conf.d/mcp.conf proxies
 *
 * A placeholder such as {slug} or {lang} stands for one dynamic segment. Example and third-party
 * hosts (schema.org, the IndexNow service…) are not ours and are skipped.
 */

const WEB = join(__dirname, "..");
const APP = join(WEB, "app");
const SITE_HOSTS = new Set(["nabd.plus", "www.nabd.plus"]);
const API_HOST = "api.nabd.plus";
const MCP_HOST = "mcp.nabd.plus";
const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"];

// ── Discovery documents (route handlers under app/.well-known plus llms.txt, llms-full.txt, auth.md) ──

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...routeFiles(p));
    else if (name === "route.ts") out.push(p);
  }
  return out;
}
const DISCOVERY_ROUTES = [
  ...routeFiles(join(APP, ".well-known")),
  join(APP, "llms.txt", "route.ts"),
  join(APP, "llms-full.txt", "route.ts"),
  join(APP, "auth.md", "route.ts"),
].filter((f) => existsSync(f));

/** Fills the dynamic segments of a discovery route with a sample value. */
function samplePath(file: string): string {
  const rel = relative(APP, file).split(sep).slice(0, -1);
  return "/" + rel.map((s) => (s.startsWith("[...") || s.startsWith("[[...") ? "api/v1/mcp" : s.startsWith("[") ? "sample" : s)).join("/");
}

// ── Route tables ──

type Matcher = (path: string) => boolean;
const segRe = (seg: string) => (/^\{[^}]+\}$|^:[A-Za-z_]+$/.test(seg) ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

/** Every page and route handler in app/, as a regex over the request path. */
function webRouteMatchers(): Matcher[] {
  const out: Matcher[] = [];
  const walk = (dir: string, parts: string[]) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name.startsWith("(") && name.endsWith(")")) walk(p, parts); // route group
        else if (name.startsWith("_")) continue; // private folder
        else walk(p, [...parts, name]);
      } else if (/^(page|route)\.(t|j)sx?$/.test(name)) {
        const re = parts.map((s) => {
          if (s === "[locale]") return `(${LOCALES.join("|")})`;
          if (s.startsWith("[[...")) return "(?:.*)?";
          if (s.startsWith("[...")) return ".+";
          if (s.startsWith("[")) return "[^/]+";
          return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        });
        const source = "^/" + re.join("/").replace(/\/\(\?:\.\*\)\?$/, "(?:/.*)?") + "/?$";
        const rx = new RegExp(source);
        out.push((path) => rx.test(path));
      }
    }
  };
  walk(APP, []);
  // locale homes are served by app/[locale]/page.tsx; "/" redirects to a locale
  out.push((path) => path === "/");
  // next.config.ts redirects answer their sources
  const config = readFileSync(join(WEB, "next.config.ts"), "utf8");
  for (const m of config.matchAll(/source:\s*"([^"]+)"/g)) {
    const rx = new RegExp("^" + m[1].split("/").map((s) => (s === ":locale" ? `(${LOCALES.join("|")})` : segRe(s))).join("/") + "/?$");
    out.push((path) => rx.test(path));
  }
  // static files
  out.push((path) => existsSync(join(WEB, "public", decodeURIComponent(path))) && statSync(join(WEB, "public", decodeURIComponent(path))).isFile());
  return out;
}

function backendRouteMatchers(): Matcher[] {
  const spec = JSON.parse(readFileSync(join(WEB, "..", "backend", "openapi.json"), "utf8")) as { paths: Record<string, unknown> };
  return Object.keys(spec.paths).map((p) => {
    const rx = new RegExp("^" + p.split("/").map(segRe).join("/") + "/?$");
    return (path: string) => rx.test(path);
  });
}

/** What deploy/nginx/conf.d/mcp.conf sends to the backend, as backend paths. */
function mcpToBackend(path: string): string | null {
  const conf = readFileSync(join(WEB, "..", "deploy", "nginx", "conf.d", "mcp.conf"), "utf8");
  const exact = new Map<string, string>();
  for (const m of conf.matchAll(/location = (\S+) \{\s*proxy_pass http:\/\/backend:8002(\S*);/g)) exact.set(m[1], m[2]);
  if (exact.has(path)) return exact.get(path)!;
  if (path === "/healthz") return "/healthz";
  const prefixes = [...conf.matchAll(/location (\/[^\s=~{]+) \{\s*proxy_pass http:\/\/backend:8002(\S*);/g)]
    .map((m) => ({ prefix: m[1], target: m[2] }))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  for (const { prefix, target } of prefixes) {
    if (!path.startsWith(prefix)) continue;
    return target ? target + path.slice(prefix.length) : path;
  }
  return null;
}

// ── URL extraction ──

const PLACEHOLDER_HOSTS = /example\.(com|org|net)|localhost|127\.0\.0\.1/;
function urlsIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>)\]\\`,]+/g)) out.add(m[0].replace(/[.;:]+$/, ""));
  // relative links in markdown: [label](/path)
  for (const m of text.matchAll(/\]\((\/[^)\s]*)\)/g)) out.add(`https://nabd.plus${m[1]}`);
  return [...out];
}

describe("AI discovery contract: every URL in .well-known, llms.txt and llms-full.txt resolves (AC-5)", () => {
  let web: Matcher[];
  let backend: Matcher[];
  const collected: Array<{ file: string; url: string }> = [];

  beforeAll(async () => {
    web = webRouteMatchers();
    backend = backendRouteMatchers();
    // Dynamic documents read the backend; answer with an empty catalogue so only the document's own links count.
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ urls: [], items: [], data: [], total: 0, pages: 0 }), { status: 200, headers: { "content-type": "application/json" } })));
    for (const file of DISCOVERY_ROUTES) {
      const mod = await import(file);
      if (typeof mod.GET !== "function") continue;
      const path = samplePath(file);
      const res: Response = await mod.GET(new Request(`https://nabd.plus${path}`), { params: Promise.resolve({ path: ["api", "v1", "mcp"] }) });
      const text = await res.text();
      for (const url of urlsIn(text)) collected.push({ file: relative(WEB, file), url });
    }
  });
  afterAll(() => { vi.unstubAllGlobals(); });

  it("found the discovery documents and their links", () => {
    expect(DISCOVERY_ROUTES.length).toBeGreaterThanOrEqual(10);
    expect(collected.length).toBeGreaterThan(20);
  });

  it("every link on one of our hosts resolves to a real route", () => {
    const broken: string[] = [];
    for (const { file, url } of collected) {
      let u: URL;
      try { u = new URL(url); } catch { broken.push(`${file}: unparsable ${url}`); continue; }
      if (PLACEHOLDER_HOSTS.test(u.hostname)) continue;
      // a documented template ({lang}, {slug}…) stands for one real segment
      const path = decodeURIComponent(u.pathname).replace(/\{lang\}|\{locale\}/g, "ar").replace(/\{[^}/]+\}/g, "sample").replace(/\/+$/, "") || "/";
      if (SITE_HOSTS.has(u.hostname)) {
        if (!web.some((m) => m(path))) broken.push(`${file}: ${url}`);
      } else if (u.hostname === API_HOST) {
        if (!backend.some((m) => m(path))) broken.push(`${file}: ${url}`);
      } else if (u.hostname === MCP_HOST) {
        const target = mcpToBackend(path);
        if (!target || !(target === "/healthz" || backend.some((m) => m(target.replace(/\/+$/, ""))))) broken.push(`${file}: ${url}`);
      } else if (/(^|\.)nabd\.plus$/.test(u.hostname)) {
        broken.push(`${file}: unknown host ${url}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("no discovery file mentions x402, USDC or a wallet", () => {
    const hits = DISCOVERY_ROUTES.filter((f) => /x402|usdc|\bwallet\b/i.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
