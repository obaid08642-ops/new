// QA 2026-10-25 (web-patient rows 9-10): /en/c, /en/p/<slug> and /en/consultations/doctors never hydrated under `pnpm start`.
// Pins, through the real nonce server in front of a Next-like upstream, that for these three public pages the browser can always
// run every script: a session/theme visitor gets a nonce in the header that sits on every tag of the HTML (never the build
// placeholder), a guest gets no nonce and a hash for every inline script, and no two responses share a nonce.
import { createHash } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { handler } from "../server/nonce-server.mjs";
import { CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER, contentSecurityPolicy } from "../lib/security/csp";

const POLICY = contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false);
// What Next writes for a static page: chunk scripts and preloads carrying the placeholder, inline flight scripts, one bare tag.
const PAGE = [
  "<html><head>",
  `<link rel="preload" as="script" href="/_next/static/chunks/a.js" nonce="${CSP_NONCE_PLACEHOLDER}"/>`,
  `<script src="/_next/static/chunks/a.js" nonce="${CSP_NONCE_PLACEHOLDER}" async=""></script>`,
  "</head><body><p>page</p>",
  `<script nonce="${CSP_NONCE_PLACEHOLDER}">self.__next_f.push([1,"x"])</script>`,
  "<script>self.__next_f.push([1,\"y\"])</script>",
  "</body></html>",
].join("");

const closers: Array<() => void> = [];
afterEach(() => { while (closers.length) closers.pop()!(); });
async function front() {
  const next = http.createServer((req, res) => {
    // proxy.ts: a session's answer is no-store; a guest's keeps Next's s-maxage
    const cache = /nabd_access=/.test(req.headers.cookie || "") ? "private, no-cache, no-store, max-age=0, must-revalidate" : "s-maxage=300, stale-while-revalidate=60";
    res.writeHead(200, { "content-type": "text/html", "content-security-policy": POLICY, [CSP_INJECT_HEADER]: "1", "cache-control": cache });
    res.end(PAGE);
  });
  await new Promise<void>((r) => next.listen(0, "127.0.0.1", r));
  const server = http.createServer(handler((next.address() as AddressInfo).port, { staticDir: null }));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  closers.push(() => { server.close(); next.close(); });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
const get = (base: string, path: string, cookie?: string) => fetch(base + path, { headers: { accept: "text/html", ...(cookie ? { cookie } : {}) } });
const scriptSrc = (r: Response) => /script-src[^;]*/.exec(r.headers.get("content-security-policy") || "")![0];
const PATHS = ["/en/c", "/en/p/some-medicine", "/en/consultations/doctors"];

describe.each(PATHS)("%s", (path) => {
  it("a signed-in or themed visitor: the header nonce is on every script and the placeholder is gone, fresh each time", async () => {
    const base = await front();
    const seen = new Set<string>();
    for (const cookie of ["nabd_access=a.b.c", "nabd.theme=dark", "nabd_access=a.b.c"]) {
      const r = await get(base, path, cookie);
      const html = await r.text();
      const nonce = /'nonce-([^']+)'/.exec(scriptSrc(r))![1];
      expect(html).not.toContain(CSP_NONCE_PLACEHOLDER);
      const tags = html.match(/<script[^>]*>/gi)!;
      expect(tags.length).toBe(3);
      for (const tag of tags) expect(tag).toContain(`nonce="${nonce}"`);
      expect(html).not.toMatch(/<link[^>]*as="script"(?![^>]*nonce=)/);
      expect(seen.has(nonce)).toBe(false);
      seen.add(nonce);
    }
  });

  it("a guest: no nonce anywhere, the shared copy hashes every inline script, external ones go through hashed loaders", async () => {
    const base = await front();
    const r = await get(base, path);
    const html = await r.text();
    const policy = scriptSrc(r);
    expect(policy).not.toContain("'nonce-");
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(html).not.toContain(CSP_NONCE_PLACEHOLDER);
    expect(html).not.toMatch(/\snonce=/);
    expect(html).not.toMatch(/<script[^>]*\ssrc=/i);
    const inline = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script\s*>/gi)];
    expect(inline.length).toBeGreaterThan(0);
    for (const m of inline) expect(policy).toContain(`'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`);
  });
});
