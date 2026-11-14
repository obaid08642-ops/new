import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { LOADER_BODY, createStamper, createThemeStamper, hashedPage, policyWithHashes, policyWithNonce, sha256Source, stampTags, stampTheme, themeFromCookie, THEME_COOKIE, CSP_NONCE_PLACEHOLDER as SERVER_PLACEHOLDER, CSP_INJECT_HEADER as SERVER_HEADER } from "../server/nonce-transform.mjs";
import { CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER, contentSecurityPolicy, hasSessionCookie } from "../lib/security/csp";

describe("F68 nonce stamping", () => {
  it("server and app agree on the placeholder and the marker header", () => {
    expect(SERVER_PLACEHOLDER).toBe(CSP_NONCE_PLACEHOLDER);
    expect(SERVER_HEADER).toBe(CSP_INJECT_HEADER);
  });

  it("stamps every opening <script>/<style>, keeps an existing nonce, leaves escaped text alone", () => {
    const html = '<script>a()</script><SCRIPT src="/x.js"></SCRIPT><style>.a{}</style><script nonce="keep">b()</script><p>&lt;script&gt;</p><scripts></scripts>';
    const out = stampTags(html, "N1");
    expect(out).toBe('<script nonce="N1">a()</script><SCRIPT nonce="N1" src="/x.js"></SCRIPT><style nonce="N1">.a{}</style><script nonce="keep">b()</script><p>&lt;script&gt;</p><scripts></scripts>');
  });

  it("replaces the placeholder Next wrote on its own tags, so no tag keeps it", () => {
    const html = `<link rel="stylesheet" href="/a.css" nonce="${CSP_NONCE_PLACEHOLDER}"/><script nonce="${CSP_NONCE_PLACEHOLDER}" src="/b.js"></script><script>c()</script>`;
    const out = stampTags(html, "N3");
    expect(out).not.toContain(CSP_NONCE_PLACEHOLDER);
    expect(out).toBe('<link rel="stylesheet" href="/a.css" nonce="N3"/><script nonce="N3" src="/b.js"></script><script nonce="N3">c()</script>');
  });

  it("stamps the preload of a script that a page prerendered at build time carries without a nonce, and leaves other links alone", () => {
    const html = '<link rel="preload" as="script" fetchPriority="low" href="/w.js"/><link rel="preload" as="script" nonce="keep" href="/k.js"/><link rel="preload" href="/f.woff2" as="font" crossorigin=""/><link rel="stylesheet" href="/a.css"/>';
    expect(stampTags(html, "N4")).toBe('<link nonce="N4" rel="preload" as="script" fetchPriority="low" href="/w.js"/><link rel="preload" as="script" nonce="keep" href="/k.js"/><link rel="preload" href="/f.woff2" as="font" crossorigin=""/><link rel="stylesheet" href="/a.css"/>');
  });

  it("a tag split across stream chunks is stamped once, and the output is identical to the one-shot result", () => {
    const html = `<html><head><link nonce="${CSP_NONCE_PLACEHOLDER}" href="/s.css"/><script>self.__next_f=[]</script><style>.b{}</style></head><body><script src="/c.js" async></script></body></html>`;
    for (let cut = 1; cut < html.length; cut++) {
      const s = createStamper("N2");
      const out = s.push(html.slice(0, cut)) + s.push(html.slice(cut)) + s.end();
      expect(out).toBe(stampTags(html, "N2"));
    }
  });

  it("puts the nonce in the policy in place of the placeholder", () => {
    const policy = policyWithNonce(contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false), "abc+/=");
    expect(policy).toContain("script-src 'self' 'nonce-abc+/=' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-abc+/='");
    expect(policy).not.toContain(CSP_NONCE_PLACEHOLDER);
  });

  it("recognises the session cookies only when they hold a value", () => {
    expect(hasSessionCookie("a=1; nabd_access=x.y.z")).toBe(true);
    expect(hasSessionCookie("nabd_refresh=r")).toBe(true);
    expect(hasSessionCookie("nabd_access=; other=1")).toBe(false);
    expect(hasSessionCookie("nabd_accessx=1")).toBe(false);
    expect(hasSessionCookie(null)).toBe(false);
  });
});

// Stamping every tag is safe only while the app renders no untrusted raw HTML. This pins the places that use
// dangerouslySetInnerHTML; adding one needs a review of what it renders (escaped or trusted only).
describe("owner decision 43 a: the theme on <html> from the cookie", () => {
  it("reads only an explicit light or dark choice, under the storage key's name", async () => {
    const { THEME_COOKIE: APP_COOKIE } = await import("../app/theme");
    expect(THEME_COOKIE).toBe(APP_COOKIE);
    expect(themeFromCookie("nabd.theme=dark")).toBe("dark");
    expect(themeFromCookie("a=1; nabd.theme=light; b=2")).toBe("light");
    expect(themeFromCookie("nabd.theme=system")).toBeNull();
    expect(themeFromCookie("xnabd.theme=dark")).toBeNull();
    expect(themeFromCookie(undefined)).toBeNull();
  });

  it("stamps the first <html> tag once, keeps a theme already there, and is the same split across chunks", () => {
    const doc = '<!DOCTYPE html><html lang="en" dir="ltr"><head></head><body><code>&lt;html&gt;</code></body></html>';
    const once = stampTheme(doc, "dark");
    expect(once).toContain('<html data-theme="dark" class="dark" style="color-scheme:dark" lang="en" dir="ltr">');
    expect(stampTheme(once, "light")).toBe(once);
    expect(stampTheme(doc, null)).toBe(doc);
    const t = createThemeStamper("dark");
    const streamed = ["<!DOCTYPE html><ht", 'ml lang="en" dir="l', 'tr"><head></head>', "<body><code>&lt;html&gt;</code></body></html>"].map((c) => t.push(c)).join("") + t.end();
    expect(streamed).toBe(once);
  });
});

describe("F68: raw HTML stays limited to reviewed places", () => {
  const ALLOWED = new Set(["app/[locale]/layout.tsx", "components-next/json-ld.tsx"]);
  const ROOT = join(__dirname, "..");
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (["node_modules", ".next", "acceptance"].includes(name)) return [];
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
  it("only the theme script and the escaped JSON-LD use dangerouslySetInnerHTML", () => {
    const users = ["app", "components-next", "components", "lib"].flatMap((d) => { try { return walk(join(ROOT, d)); } catch { return []; } })
      .filter((f) => readFileSync(f, "utf8").includes("dangerouslySetInnerHTML"))
      .map((f) => relative(ROOT, f));
    expect(users.filter((f) => !ALLOWED.has(f))).toEqual([]);
  });
});

const decode = (v: string) => v.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

describe("owner decision 2026-10-16: the hashed copy a shared cache keeps", () => {
  it("a src that tries to close the loader's tag stays inside an escaped attribute, and the loader is hashed", () => {
    const { html, scriptHashes } = hashedPage('<body><script src="/x.js?a=&lt;/script&gt;&lt;script&gt;alert(1)//" async=""></script></body>');
    expect(html).not.toMatch(/<\/script[^>]*>\s*<script\b[^>]*>alert/i);
    expect(html.match(/<script\b[^>]*>/gi)?.length).toBe(1);
    const loader = /<script\b[^>]*>([\s\S]*)<\/script[^>]*>/i.exec(html)?.[1] || "";
    expect(loader).toBe(LOADER_BODY);
    expect(scriptHashes).toEqual([sha256Source(loader)]);
  });

  // Next 16.4's bootstrap needs the inline `TURBOPACK.push(...)` to run before the runtime chunk is loaded (or, if after,
  // with a src script as document.currentScript). One early loader for every script started the runtime chunk first and the
  // page never became interactive (`Invalid URL`); each script now sits where Next put it.
  it("each external script is replaced where it stood, so inline scripts keep their place between them", () => {
    const page = [
      '<head><script src="/_next/static/chunks/a.js" async=""></script></head><body>',
      '<script src="/_next/static/chunks/turbopack-x.js" async=""></script>',
      '<script>(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push({"otherChunks":["static/b.js"]})</script>',
      '<script src="/_next/static/chunks/b.js" async=""></script></body>',
    ].join("");
    const { html } = hashedPage(page);
    const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script[^>]*>/gi)].map((m) => ({ attrs: m[1], body: m[2] }));
    expect(tags.map((t) => (t.body === LOADER_BODY ? "loader" : "inline"))).toEqual(["loader", "loader", "inline", "loader"]);
    expect(tags[2].body).toContain("TURBOPACK");
    // the script each loader rebuilds, in order
    const rebuilt = tags.filter((t) => t.body === LOADER_BODY).map((t) => JSON.parse(decode(/data-nabd-script="([^"]*)"/.exec(t.attrs)![1])).src);
    expect(rebuilt).toEqual(["/_next/static/chunks/a.js", "/_next/static/chunks/turbopack-x.js", "/_next/static/chunks/b.js"]);
  });

  it("all loaders have the same text, so the policy carries one hash for them (plus one per distinct inline script)", () => {
    const { scriptHashes } = hashedPage('<script src="/1.js"></script><script src="/2.js" async=""></script><script src="/3.js" crossorigin="" integrity="sha384-x"></script><script>a()</script>');
    expect(scriptHashes).toEqual([sha256Source(LOADER_BODY), sha256Source("a()")]);
  });

  it("running a loader inserts a script with the same attributes before itself; async stays off unless the original had it", () => {
    const run = (attrs: Record<string, string>) => {
      const created: Array<{ attrs: Record<string, string>; async?: boolean }> = [];
      const inserted: unknown[] = [];
      const self = { getAttribute: (n: string) => (n === "data-nabd-script" ? JSON.stringify(attrs) : null), parentNode: { insertBefore: (e: unknown, ref: unknown) => inserted.push([e, ref]) } };
      const document = { currentScript: self, createElement: () => { const e: { attrs: Record<string, string>; async?: boolean; setAttribute: (k: string, v: string) => void } = { attrs: {}, setAttribute(k, v) { e.attrs[k] = v; } }; created.push(e); return e; } };
      new Function("document", LOADER_BODY)(document);
      return { created, inserted, self };
    };
    const ordered = run({ src: "/a.js" });
    expect(ordered.created[0].attrs).toEqual({ src: "/a.js" });
    expect(ordered.created[0].async).toBe(false);
    expect(ordered.inserted).toEqual([[ordered.created[0], ordered.self]]);
    const asyncOne = run({ src: "/b.js", async: "" });
    expect(asyncOne.created[0].attrs).toEqual({ src: "/b.js", async: "" });
    expect(asyncOne.created[0].async).toBeUndefined();
  });

  it("removes every nonce (attributes and the placeholder in Next's payload) and keeps inline styles allowed by hash", () => {
    const { html, styleHashes } = hashedPage(`<head><style nonce="${SERVER_PLACEHOLDER}">a{}</style></head><script>x("${SERVER_PLACEHOLDER}")</script>`);
    expect(html).not.toContain(SERVER_PLACEHOLDER);
    expect(html).not.toMatch(/nonce=/);
    expect(styleHashes).toEqual([sha256Source("a{}")]);
  });

  it("the policy loses every nonce, gains the hashes, keeps 'strict-dynamic' and never allows 'unsafe-inline' scripts", () => {
    const policy = policyWithHashes(contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false), ["'sha256-AAA='"], ["'sha256-BBB='"]);
    expect(policy).not.toMatch(/'nonce-/);
    expect(policy).toMatch(/script-src [^;]*'strict-dynamic'[^;]*'sha256-AAA='/);
    expect(policy).toMatch(/style-src [^;]*'sha256-BBB='/);
    expect(() => policyWithHashes("script-src 'self' 'unsafe-inline'", [], [])).toThrow();
  });
});
