import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createStamper, policyWithNonce, stampTags, CSP_NONCE_PLACEHOLDER as SERVER_PLACEHOLDER, CSP_INJECT_HEADER as SERVER_HEADER } from "../server/nonce-transform.mjs";
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
